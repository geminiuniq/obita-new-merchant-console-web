// =============================================================================
// header.js — profile dropdown + notification bell wiring.
// =============================================================================

import { Api } from '../api.js';
import { $, $$ } from './dom.js';
import { t } from './i18n.js';
import { openInbox } from './inbox.js';

export function bindHeader({ onLogout }) {
    const menu = $('#profile-menu');
    const btn  = $('#btn-profile');
    if (btn && menu) {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            menu.classList.toggle('is-open');
        });
        document.addEventListener('click', (ev) => {
            if (!menu.contains(ev.target) && ev.target !== btn) {
                menu.classList.remove('is-open');
            }
        });
        menu.addEventListener('click', (ev) => {
            const item = ev.target.closest('.dropdown-item');
            if (!item) return;
            const action = item.dataset.action;
            menu.classList.remove('is-open');
            if (action === 'logout') {
                onLogout?.();
            } else if (action === 'docs') {
                window.open(`${Api.baseUrl()}/swagger-ui.html`, '_blank', 'noopener');
            } else if (action === 'my-profile' || action === 'security') {
                // Mock-only: surface a toast pointing to the future page.
                import('./ui.js').then(({ toast }) => {
                    toast(t(`profile.toast.${action}`), 'info', 2200);
                });
            }
        });
    }

    const notifBtn = $('#btn-notif');
    if (notifBtn) notifBtn.addEventListener('click', openInbox);
}

// Sync profile menu user info from the active session.
export function refreshProfileMenu() {
    const session = Api.loadSession() || {};
    const user = session.username || 'demo';
    const code = session.merchantCode || 'DEMO';
    $('#profile-user-name')  .textContent = `${user} · ${code}`;
    $('#profile-user-email') .textContent = `${user}@obita.local`;
    // Translate dropdown items
    $$('#profile-menu [data-i18n]').forEach(span => {
        span.textContent = t(span.dataset.i18n);
    });
}
