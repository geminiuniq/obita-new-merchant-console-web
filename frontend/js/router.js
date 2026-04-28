// =============================================================================
// router.js — hash-based router for the merchant portal SPA.
// =============================================================================

import { $, $$, el, clear } from './dom.js';
import { t } from './i18n.js';
import { pageHero } from './ui.js';

const ROUTES = Object.create(null);
let currentRoute = null;

export function registerRoute(name, render) { ROUTES[name] = render; }

export function getCurrentRoute() { return currentRoute; }

export async function navigate(route, { replace = false, force = false, skipPush = false } = {}) {
    if (!ROUTES[route]) route = 'overview';
    if (currentRoute === route && !force) return;

    currentRoute = route;
    if (!skipPush) {
        if (replace) history.replaceState(null, '', `#${route}`);
        else         history.pushState(null, '', `#${route}`);
    }

    $$('.nav-item').forEach(a => {
        a.classList.toggle('active', a.dataset.route === route);
    });

    const body = $('#content-body');
    clear(body);
    body.appendChild(el('div', { class: 'empty', text: t('common.loading') }));
    try {
        await ROUTES[route](body);
    } catch (err) {
        clear(body);
        body.appendChild(pageHero({
            eyebrow: 'OBITA · ERROR',
            title: t('common.error.head'),
            sub: err.message || String(err),
        }));
    }
}

export function startRouter() {
    window.addEventListener('hashchange', () => {
        const route = (location.hash || '').replace(/^#/, '') || 'overview';
        navigate(route, { replace: true, skipPush: true });
    });
    document.getElementById('sidebar-nav').addEventListener('click', (ev) => {
        const a = ev.target.closest('.nav-item');
        if (!a) return;
        ev.preventDefault();
        navigate(a.dataset.route);
    });
}

// Light polling helper used by the vault flow (after mock-bank credit).
let pollTimer = null;
export function pollCurrentRoute(durationMs, intervalMs = 6000) {
    if (pollTimer) clearInterval(pollTimer);
    const stopAt = Date.now() + durationMs;
    pollTimer = setInterval(async () => {
        if (['vault', 'overview', 'ledger'].includes(currentRoute)) {
            navigate(currentRoute, { force: true, skipPush: true });
        }
        if (Date.now() > stopAt) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }, intervalMs);
}
