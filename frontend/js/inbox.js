// =============================================================================
// inbox.js — mock inbox messages. Real wiring would consume the backend
// audit_log / outbox stream once shipped (P1 roadmap).
// =============================================================================

import { $, el, clear } from './dom.js';
import { t } from './i18n.js';
import { openDrawer } from './drawer.js';

function mockMessages() {
    return [
        {
            unread: true,
            titleKey: 'inbox.msg.compliance.title',
            bodyKey:  'inbox.msg.compliance.body',
            timeKey:  'inbox.time.2min',
        },
        {
            unread: true,
            titleKey: 'inbox.msg.deposit.title',
            bodyKey:  'inbox.msg.deposit.body',
            timeKey:  'inbox.time.10min',
        },
        {
            unread: false,
            titleKey: 'inbox.msg.statement.title',
            bodyKey:  'inbox.msg.statement.body',
            timeKey:  'inbox.time.1day',
        },
        {
            unread: false,
            titleKey: 'inbox.msg.welcome.title',
            bodyKey:  'inbox.msg.welcome.body',
            timeKey:  'inbox.time.3day',
        },
    ];
}

export function renderInbox() {
    const body = $('#inbox-body');
    const titleEl = $('#inbox-title');
    if (!body) return;
    titleEl.textContent = t('inbox.title');

    clear(body);
    const messages = mockMessages();
    if (messages.length === 0) {
        body.appendChild(el('div', { class: 'empty', text: t('inbox.empty') }));
        return;
    }
    for (const m of messages) {
        const row = el('div', { class: m.unread ? 'inbox-msg unread' : 'inbox-msg' }, [
            el('span', { class: 'msg-indicator' }),
            el('div', { class: 'msg-content' }, [
                el('div', { class: 'msg-title-row' }, [
                    el('span', { class: 'msg-title', text: t(m.titleKey) }),
                    m.unread ? el('span', { class: 'badge-unread', text: t('inbox.unread') }) : null,
                ]),
                el('p', { class: 'msg-preview', text: t(m.bodyKey) }),
                el('span', { class: 'msg-time', text: t(m.timeKey) }),
            ]),
        ]);
        row.addEventListener('click', () => row.classList.remove('unread'));
        body.appendChild(row);
    }
}

export function openInbox() {
    renderInbox();
    openDrawer('#inbox-drawer');
}

// Set the badge dot on the bell button if there are unread messages.
export function refreshNotifDot() {
    const dot = $('#notif-dot');
    if (!dot) return;
    const hasUnread = mockMessages().some(m => m.unread);
    dot.style.display = hasUnread ? 'block' : 'none';
}
