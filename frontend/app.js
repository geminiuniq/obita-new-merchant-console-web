// =============================================================================
// app.js — entry point. Wires login, language/theme toggles, modal handlers,
// registers routes, and starts the router.
//
// Heavy lifting lives in js/* — this file is intentionally small.
// =============================================================================

import { Api, ApiError } from './api.js';
import { $, $$ } from './js/dom.js';
import { applyStaticI18n, setLang, getLang, onLangChanged } from './js/i18n.js';
import { applyTheme, getTheme, toggleTheme } from './js/theme.js';
import { toast } from './js/ui.js';
import { registerRoute, navigate, startRouter, getCurrentRoute } from './js/router.js';
import { renderOverview } from './js/pages/overview.js';
import { renderVault } from './js/pages/vault.js';
import { renderOrders, bindCreateOrderForm } from './js/pages/orders.js';
import { renderLedger } from './js/pages/ledger.js';
import { renderComingSoon } from './js/pages/coming-soon.js';

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
registerRoute('overview', renderOverview);
registerRoute('vault',    renderVault);
registerRoute('orders',   renderOrders);
registerRoute('ledger',   renderLedger);
['fiat-vault', 'payouts', 'conversion', 'approvals', 'reports', 'members']
    .forEach(r => registerRoute(r, () => renderComingSoon(r)));

onLangChanged(() => {
    const cur = getCurrentRoute();
    if (cur) navigate(cur, { force: true, skipPush: true });
});

// ---------------------------------------------------------------------------
// Login flow
// ---------------------------------------------------------------------------
$('#login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const errEl = $('#login-error');
    errEl.classList.add('hidden');
    try {
        await Api.login({
            merchantCode: fd.get('merchantCode').trim(),
            username:     fd.get('username').trim(),
            password:     fd.get('password'),
        });
        enterApp();
    } catch (err) {
        errEl.textContent = err instanceof ApiError ? err.message : String(err);
        errEl.classList.remove('hidden');
    }
});

document.addEventListener('auth:expired', () => {
    toast(/* keep simple — i18n already applied to login screen */ 'Session expired', 'error');
    showLogin();
});

$('#btn-logout').addEventListener('click', () => {
    Api.clearSession();
    showLogin();
});

$('#btn-refresh').addEventListener('click', () => {
    const cur = getCurrentRoute();
    if (cur) navigate(cur, { force: true, skipPush: true });
});

$('#btn-lang').addEventListener('click', () => {
    setLang(getLang() === 'en' ? 'zh' : 'en');
});

$('#btn-theme').addEventListener('click', toggleTheme);

// Modal close (data-close attribute on overlay / × / cancel)
$$('[data-close]').forEach(elt => elt.addEventListener('click', () => {
    elt.closest('.modal').classList.add('hidden');
}));

bindCreateOrderForm();

function showLogin() {
    document.body.classList.add('is-logged-out');
    $('#view-app').classList.add('hidden');
    $('#view-login').classList.remove('hidden');
}

function enterApp() {
    const session = Api.loadSession() || {};
    const code = session.merchantCode || '—';
    const user = session.username || '—';
    $('#header-merchant-name').textContent = code;
    $('#header-logo').textContent = (code[0] || '·').toUpperCase();
    const avatarBtn = $('#btn-logout');
    avatarBtn.textContent = (user[0] || 'D').toUpperCase();

    document.body.classList.remove('is-logged-out');
    $('#view-login').classList.add('hidden');
    $('#view-app').classList.remove('hidden');
    applyStaticI18n();

    const initial = (location.hash || '').replace(/^#/, '') || 'overview';
    navigate(initial, { replace: true });
}

// ---------------------------------------------------------------------------
// One-off: API base label + sidebar foot
// ---------------------------------------------------------------------------
$('#login-api-base').textContent = Api.baseUrl();
$('#sidebar-foot-api').textContent = (() => {
    try { return new URL(Api.baseUrl()).host; } catch { return Api.baseUrl(); }
})();

// Live clock for login panel
function tickLoginTime() {
    const node = $('#login-brand-time');
    if (!node) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    node.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} HKT`;
}
tickLoginTime();
setInterval(tickLoginTime, 1000);

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
applyTheme(getTheme());
applyStaticI18n();
startRouter();

if (Api.isLoggedIn()) {
    enterApp();
} else {
    showLogin();
}
