// =============================================================================
// i18n.js — t() lookup, lang persistence, static-DOM re-render hook.
// =============================================================================

import { STRINGS } from './strings.js';
import { $, $$ } from './dom.js';
import { Api } from '../api.js';

const I18N_KEY = 'obita.lang';
const SUPPORTED = ['en', 'zh'];

let currentLang = (() => {
    const saved = localStorage.getItem(I18N_KEY);
    return SUPPORTED.includes(saved) ? saved : 'en';
})();

export function getLang() { return currentLang; }

export function t(key) {
    const dict = STRINGS[currentLang] || STRINGS.en;
    return dict[key] ?? STRINGS.en[key] ?? key;
}

let onLangChange = null;
export function onLangChanged(handler) { onLangChange = handler; }

export function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem(I18N_KEY, lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applyStaticI18n();
    onLangChange?.();
}

// ---------------------------------------------------------------------------
// Static (non-rendered) i18n: labels in HTML the router doesn't redraw.
// Updates login screen, header, sidebar nav labels, and modal labels.
// ---------------------------------------------------------------------------
export function applyStaticI18n() {
    const setText = (sel, key) => { const n = $(sel); if (n) n.textContent = t(key); };

    // Login
    setText('#login-eyebrow', 'login.eyebrow');
    setText('#login-title',   'login.title');
    setText('#login-sub',     'login.sub');
    setText('#login-merchant-label', 'login.merchant');
    setText('#login-username-label', 'login.username');
    setText('#login-password-label', 'login.password');
    setText('#login-submit', 'login.submit');
    setText('#login-api-label', 'login.api');
    setText('#login-brand-eyebrow', 'login.brand.eyebrow');
    setText('#login-brand-l1', 'login.brand.headline.l1');
    setText('#login-brand-l2', 'login.brand.headline.l2');
    setText('#login-brand-em', 'login.brand.headline.em');
    setText('#login-brand-sub', 'login.brand.sub');
    setText('#login-brand-status', 'login.brand.live');
    setText('#login-brand-seal',   'login.brand.seal');

    // Header
    setText('#header-merchant-label', 'header.merchant');
    const refreshBtn = $('#btn-refresh'); if (refreshBtn) refreshBtn.title = t('header.refresh');
    const notifBtn   = $('#btn-notif');   if (notifBtn)   notifBtn.title   = t('header.notif');
    const langBtn    = $('#btn-lang');
    if (langBtn) {
        langBtn.title = t('header.lang');
        langBtn.textContent = currentLang === 'zh' ? '中' : 'EN';
    }
    const avatar     = $('#btn-profile');
    if (avatar) {
        const session = Api.loadSession() || {};
        const user = session.username || 'D';
        avatar.title = `${user}`;
    }

    // Sidebar
    $$('#sidebar-nav .nav-item').forEach(a => {
        const span = a.querySelector('.nav-label');
        if (span) span.textContent = t(`nav.${a.dataset.route}`);
        const soon = a.querySelector('.nav-coming-soon');
        if (soon) soon.textContent = t('nav.soon');
    });
    $$('#sidebar-nav .nav-section-label').forEach(s => {
        const k = s.dataset.i18n;
        if (k) s.textContent = t(k);
    });
    setText('#sidebar-foot-label', 'sidebar.backend');

    // Order create modal
    setText('#m-order-title', 'orders.modal.title');
    setText('#m-order-no-label', 'orders.modal.no');
    setText('#m-order-quote-label', 'orders.modal.quote');
    setText('#m-order-quote-amount-label', 'orders.modal.amount');
    setText('#m-order-settle-label', 'orders.modal.settleAsset');
    setText('#m-order-settle-amount-label', 'orders.modal.amount');
    setText('#m-order-channel-label', 'orders.modal.channel');
    setText('#m-order-desc-label', 'orders.modal.desc');
    const descInput = $('#m-order-desc-input');
    if (descInput) descInput.placeholder = t('orders.modal.desc.placeholder');
    setText('#m-order-cancel', 'orders.modal.cancel');
    setText('#m-order-create', 'orders.modal.create');

    // Withdrawal create modal (Sprint 6)
    setText('#m-wdr-title',    'payouts.modal.title');
    setText('#m-wdr-chain-label',  'payouts.modal.chain');
    setText('#m-wdr-asset-label',  'payouts.modal.asset');
    setText('#m-wdr-amount-label', 'payouts.modal.amount');
    setText('#m-wdr-to-label',     'payouts.modal.to');
    setText('#m-wdr-cancel', 'payouts.modal.cancel');
    setText('#m-wdr-create', 'payouts.modal.submit');
    const fe = $('#m-wdr-foureyes');
    if (fe) fe.textContent = t('payouts.modal.foureyes');

    // Inbox drawer
    setText('#inbox-title', 'inbox.title');

    // Profile dropdown items
    $$('#profile-menu [data-i18n]').forEach(span => {
        span.textContent = t(span.dataset.i18n);
    });
}
