// =============================================================================
// pages/approvals.js — Approvals mock page (severity rows, legacy §3.5).
// =============================================================================

import { el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard, toast } from '../ui.js';

function mockApprovals() {
    return [
        {
            severity: 'danger', // compliance
            categoryKey: 'approvals.cat.compliance',
            titleKey:    'approvals.row.compliance.title',
            metaKey:     'approvals.row.compliance.meta',
            requestedBy: 'compliance@obita.local',
            requestedAt: '2026-04-29T07:18:00Z',
        },
        {
            severity: 'warn',
            categoryKey: 'approvals.cat.payout',
            titleKey:    'approvals.row.payout.title',
            metaKey:     'approvals.row.payout.meta',
            requestedBy: 'ops@obita.local',
            requestedAt: '2026-04-29T03:44:00Z',
        },
        {
            severity: 'info',
            categoryKey: 'approvals.cat.address',
            titleKey:    'approvals.row.address.title',
            metaKey:     'approvals.row.address.meta',
            requestedBy: 'ops@obita.local',
            requestedAt: '2026-04-28T22:11:00Z',
        },
        {
            severity: 'success',
            categoryKey: 'approvals.cat.member',
            titleKey:    'approvals.row.member.title',
            metaKey:     'approvals.row.member.meta',
            requestedBy: 'admin@obita.local',
            requestedAt: '2026-04-28T15:02:00Z',
        },
    ];
}

const SEV_BAR = {
    danger:  '4px',
    warn:    '3px',
    info:    '3px',
    success: '2px',
};

export function renderApprovals(root) {
    clear(root);
    const list = mockApprovals();

    root.appendChild(pageHero({
        eyebrow: 'OBITA · APPROVAL QUEUE',
        title: t('soon.approvals.title'),
        sub: t('approvals.sub'),
    }));

    const counts = {
        total:    list.length,
        urgent:   list.filter(r => r.severity === 'danger').length,
        action:   list.filter(r => r.severity === 'warn').length,
        info:     list.filter(r => r.severity === 'info' || r.severity === 'success').length,
    };
    const tile = (variant, label, value, meta, hero = false) => el('div', { class: hero ? 'kpi-tile kpi-tile--hero' : 'kpi-tile' }, [
        el('div', { class: 'kpi-label' }, [el('span', { class: `kpi-dot kpi-dot--${variant}` }), label]),
        el('div', { class: 'kpi-value', text: value }),
        el('div', { class: 'kpi-meta', text: meta }),
    ]);
    root.appendChild(el('div', { class: 'kpi-strip' }, [
        tile('brass',   t('approvals.kpi.total'),  fmt.int(counts.total),  t('approvals.kpi.total.meta'), true),
        tile('warn',    t('approvals.kpi.urgent'), fmt.int(counts.urgent), t('approvals.kpi.urgent.meta')),
        tile('info',    t('approvals.kpi.action'), fmt.int(counts.action), t('approvals.kpi.action.meta')),
        tile('success', t('approvals.kpi.info'),   fmt.int(counts.info),   t('approvals.kpi.info.meta')),
    ]));

    // Severity rows — legacy design.md §3.5
    const rows = el('div', { style: 'display:flex; flex-direction:column;' });
    list.forEach(r => rows.appendChild(approvalRow(r)));

    root.appendChild(sectionCard({ index: '01', title: t('approvals.section') }, rows));

    root.appendChild(el('div', { class: 'alert alert--info', style: 'margin-top:16px;' }, [
        el('strong', { text: t('soon.label') + ': ' }),
        t('approvals.note'),
    ]));
}

function approvalRow(r) {
    const sevBg = `var(--status-${r.severity}-soft-bg)`;
    const sevBar = SEV_BAR[r.severity] || '3px';
    return el('div', {
        style: `
            display:grid;
            grid-template-columns: ${sevBar} 1fr auto;
            gap: 16px;
            background: ${sevBg};
            border-bottom: 1px solid var(--line-soft);
            padding: 16px 24px;
        `,
    }, [
        el('div', { style: `background: var(--status-${r.severity}-strong); border-radius: 2px;` }),
        el('div', {}, [
            el('div', { style: 'display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px;' }, [
                el('span', { class: `pill pill--${r.severity}`, text: t(r.categoryKey) }),
                el('span', { style: 'font-weight:600; color:var(--ink-strong); font-size:14px;', text: t(r.titleKey) }),
            ]),
            el('div', { class: 'mono', style: 'font-size:12px; color:var(--ink-mute);', text: t(r.metaKey) }),
            el('div', { style: 'font-size:12px; color:var(--ink-mid); margin-top:6px;' }, [
                t('approvals.requested.by') + ' ',
                el('code', { text: r.requestedBy }),
                ' · ',
                fmt.time(r.requestedAt),
            ]),
        ]),
        el('div', { style: 'display:flex; gap:8px; align-items:center;' }, [
            el('button', {
                class: 'btn btn--small btn--ghost',
                text: t('approvals.action.reject'),
                onclick: () => toast(t('approvals.action.toast'), 'info', 2000),
            }),
            el('button', {
                class: 'btn btn--small btn--primary',
                text: t('approvals.action.approve'),
                onclick: () => toast(t('approvals.action.toast'), 'info', 2000),
            }),
        ]),
    ]);
}
