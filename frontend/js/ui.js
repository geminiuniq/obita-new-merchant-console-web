// =============================================================================
// ui.js — shared UI primitives: pageHero, sectionCard, statusPill,
//         comingSoon, toast, showError. Theme-agnostic; consume tokens via CSS.
// =============================================================================

import { el, $ } from './dom.js';
import { t } from './i18n.js';
import { ApiError } from '../api.js';

// Status code → pill variant. Keep keys aligned with backend constants.
const STATUS_PILL = {
    CREATED:         'neutral',
    PENDING_PAYMENT: 'warn',
    PAID:            'info',
    SETTLED:         'success',
    REFUNDING:       'warn',
    REFUNDED:        'neutral',
    CANCELLED:       'neutral',
    EXPIRED:         'neutral',
    // Withdrawal lifecycle (Sprint 6) — see WithdrawalStatus.java
    REQUESTED:       'warn',
    RISK_REVIEW:     'warn',
    APPROVED:        'info',
    REJECTED:        'danger',
    SUBMITTED:       'info',
    CONFIRMING:      'info',
    COMPLETED:       'success',
    FAILED:          'danger',
};

export function statusPill(status) {
    const variant = STATUS_PILL[status] || 'neutral';
    return el('span', { class: `pill pill--${variant}`, text: status });
}

// Editorial header card per page (legacy design.md §3.1)
export function pageHero({ eyebrow, title, sub, actions = [] }) {
    return el('div', { class: 'page-hero' }, [
        el('div', { class: 'page-hero-head' }, [
            el('div', {}, [
                el('div', { class: 'eyebrow-brass', text: eyebrow }),
                el('h1', { text: title }),
                sub ? el('p', { class: 'page-hero-sub', text: sub }) : null,
            ]),
            actions.length ? el('div', { class: 'page-hero-actions' }, actions) : null,
        ]),
    ]);
}

// Section card with mono index pill (legacy design.md §3.2)
export function sectionCard({ index, title, action }, body) {
    const head = el('header', { class: 'section-head' }, [
        index ? el('span', { class: 'idx-pill', text: index }) : null,
        el('h2', { text: title }),
        action ? el('div', { class: 'section-head-actions' }, action) : null,
    ]);
    const bodyNode = el('div', { class: 'section-body section-body--flush' });
    [].concat(body || []).forEach(b => {
        if (b == null || b === false) return;
        bodyNode.appendChild(typeof b === 'string' ? document.createTextNode(b) : b);
    });
    return el('section', { class: 'section-card' }, [head, bodyNode]);
}

export function comingSoon(title, msg) {
    return el('div', { class: 'coming-soon' }, [
        el('span', { class: 'pill pill--neutral', text: t('soon.label') }),
        el('h3', { text: title }),
        el('p', { text: msg }),
    ]);
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
let _toastTimer = null;
export function toast(msg, kind = 'info', ms = 3500) {
    const node = $('#toast');
    if (!node) return;
    node.className = `toast toast--${kind}`;
    node.textContent = msg;
    node.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => node.classList.add('hidden'), ms);
}

export function showError(err) {
    const msg = err instanceof ApiError
        ? `${err.code}: ${err.message}`
        : (err?.message || String(err));
    toast(msg, 'error', 5000);
}
