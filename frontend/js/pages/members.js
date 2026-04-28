// =============================================================================
// pages/members.js — Members mock page (no backend yet).
// Editorial layout matching legacy: hero + KPI strip + role-tagged table.
// =============================================================================

import { el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard } from '../ui.js';

const ROLES = {
    OWNER:        { variant: 'success', label: 'Owner' },
    MERCHANT_ADMIN:{ variant: 'info',   label: 'Admin' },
    OPERATOR:     { variant: 'neutral', label: 'Operator' },
    VIEWER:       { variant: 'neutral', label: 'Viewer' },
};

function mockMembers() {
    return [
        { name: 'Justin Shi',     email: 'shijiaqin@gmail.com', role: 'OWNER',          mfa: true,  lastLogin: '2026-04-29T08:14:00Z', status: 'active' },
        { name: 'Nancy User',     email: 'nancy@obita.demo',    role: 'MERCHANT_ADMIN', mfa: true,  lastLogin: '2026-04-28T20:02:00Z', status: 'active' },
        { name: 'Ops · Treasury', email: 'ops@obita.demo',      role: 'OPERATOR',       mfa: false, lastLogin: '2026-04-27T10:31:00Z', status: 'active' },
        { name: 'Audit · Read',   email: 'audit@obita.demo',    role: 'VIEWER',         mfa: true,  lastLogin: '2026-04-15T13:48:00Z', status: 'active' },
        { name: 'Pending Invite', email: 'newhire@obita.demo',  role: 'OPERATOR',       mfa: false, lastLogin: null,                   status: 'pending' },
    ];
}

export function renderMembers(root) {
    clear(root);
    const members = mockMembers();

    root.appendChild(pageHero({
        eyebrow: 'OBITA · MEMBER MANAGEMENT',
        title: t('soon.members.title'),
        sub: t('members.sub'),
        actions: [
            el('button', {
                class: 'btn btn--primary',
                text: t('members.invite'),
                onclick: () => import('../ui.js').then(({ toast }) =>
                    toast(t('members.invite.toast'), 'info', 2200)),
            }),
        ],
    }));

    // KPI strip — 4 tiles
    const counts = {
        total:   members.length,
        active:  members.filter(m => m.status === 'active').length,
        mfa:     members.filter(m => m.mfa).length,
        pending: members.filter(m => m.status === 'pending').length,
    };
    const tile = (variant, label, value, meta, hero = false) => el('div', { class: hero ? 'kpi-tile kpi-tile--hero' : 'kpi-tile' }, [
        el('div', { class: 'kpi-label' }, [el('span', { class: `kpi-dot kpi-dot--${variant}` }), label]),
        el('div', { class: 'kpi-value', text: value }),
        el('div', { class: 'kpi-meta', text: meta }),
    ]);
    root.appendChild(el('div', { class: 'kpi-strip' }, [
        tile('brass',   t('members.kpi.total'),   fmt.int(counts.total),   t('members.kpi.total.meta'), true),
        tile('success', t('members.kpi.active'),  fmt.int(counts.active),  t('members.kpi.active.meta')),
        tile('info',    t('members.kpi.mfa'),     fmt.int(counts.mfa),     t('members.kpi.mfa.meta')),
        tile('warn',    t('members.kpi.pending'), fmt.int(counts.pending), t('members.kpi.pending.meta')),
    ]));

    // Members table
    const wrap = el('div', { class: 'data-table-wrap' });
    wrap.appendChild(el('table', { class: 'data-table' }, [
        el('thead', {}, el('tr', {}, [
            el('th', { text: t('members.col.name') }),
            el('th', { text: t('members.col.email') }),
            el('th', { text: t('members.col.role') }),
            el('th', { text: t('members.col.mfa') }),
            el('th', { text: t('members.col.last') }),
            el('th', { text: t('members.col.status') }),
        ])),
        el('tbody', {}, members.map(m => {
            const role = ROLES[m.role] || { variant: 'neutral', label: m.role };
            return el('tr', {}, [
                el('td', {}, [
                    el('div', { class: 'cell-no', text: m.name }),
                ]),
                el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: m.email }),
                el('td', {}, el('span', { class: `pill pill--${role.variant}`, text: role.label.toUpperCase() })),
                el('td', {}, el('span', {
                    class: m.mfa ? 'pill pill--success' : 'pill pill--warn',
                    text: m.mfa ? 'TOTP' : 'OFF',
                })),
                el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: m.lastLogin ? fmt.time(m.lastLogin) : '—' }),
                el('td', {}, el('span', {
                    class: m.status === 'active' ? 'pill pill--success' : 'pill pill--warn',
                    text: (m.status || '').toUpperCase(),
                })),
            ]);
        })),
    ]));
    root.appendChild(sectionCard({ index: '01', title: t('members.section') }, wrap));

    root.appendChild(el('div', { class: 'alert alert--info', style: 'margin-top:16px;' }, [
        el('strong', { text: t('soon.label') + ': ' }),
        t('members.note'),
    ]));
}
