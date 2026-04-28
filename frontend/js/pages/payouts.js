// =============================================================================
// pages/payouts.js — Payouts mock (withdrawal requests, 4-eyes ready).
// =============================================================================

import { el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard, toast } from '../ui.js';

const STATUS = {
    DRAFT:        'neutral',
    PENDING_APPROVAL: 'warn',
    APPROVED:     'info',
    BROADCAST:    'info',
    CONFIRMED:    'success',
    REJECTED:     'danger',
};

function mockPayouts() {
    return [
        { id: 'WDR-001', to: '0x9fA4…b3D2', chain: 'POLYGON', asset: 'USDC-POLYGON', amount: '120.00', status: 'PENDING_APPROVAL', requestedAt: '2026-04-29T07:50:00Z' },
        { id: 'WDR-002', to: 'TQrY5xMK…RQ1CZ', chain: 'TRON',  asset: 'USDT-TRC20', amount: '500.00', status: 'CONFIRMED',        requestedAt: '2026-04-28T03:18:00Z' },
        { id: 'WDR-003', to: '0xA0b8…06eB48', chain: 'ETH',    asset: 'USDC-ETH',   amount: '250.00', status: 'APPROVED',         requestedAt: '2026-04-29T06:30:00Z' },
        { id: 'WDR-004', to: '0x71C7…d8976F', chain: 'BSC',    asset: 'USDT-BSC',   amount: '80.00',  status: 'REJECTED',         requestedAt: '2026-04-27T18:02:00Z' },
    ];
}

export function renderPayouts(root) {
    clear(root);
    const rows = mockPayouts();

    root.appendChild(pageHero({
        eyebrow: 'TCSP · PAYOUT ORDERS',
        title: t('soon.payouts.title'),
        sub: t('payouts.sub'),
        actions: [
            el('button', {
                class: 'btn btn--primary',
                text: t('payouts.new'),
                onclick: () => toast(t('payouts.toast'), 'info', 2200),
            }),
        ],
    }));

    const counts = {
        all:       rows.length,
        pending:   rows.filter(r => r.status === 'PENDING_APPROVAL').length,
        approved:  rows.filter(r => ['APPROVED', 'BROADCAST'].includes(r.status)).length,
        confirmed: rows.filter(r => r.status === 'CONFIRMED').length,
    };
    const tile = (variant, label, value, meta, hero = false) => el('div', { class: hero ? 'kpi-tile kpi-tile--hero' : 'kpi-tile' }, [
        el('div', { class: 'kpi-label' }, [el('span', { class: `kpi-dot kpi-dot--${variant}` }), label]),
        el('div', { class: 'kpi-value', text: value }),
        el('div', { class: 'kpi-meta', text: meta }),
    ]);
    root.appendChild(el('div', { class: 'kpi-strip' }, [
        tile('brass',   t('payouts.kpi.all'),       fmt.int(counts.all),       t('payouts.kpi.all.meta'), true),
        tile('warn',    t('payouts.kpi.pending'),   fmt.int(counts.pending),   t('payouts.kpi.pending.meta')),
        tile('info',    t('payouts.kpi.approved'),  fmt.int(counts.approved),  t('payouts.kpi.approved.meta')),
        tile('success', t('payouts.kpi.confirmed'), fmt.int(counts.confirmed), t('payouts.kpi.confirmed.meta')),
    ]));

    const tbl = el('div', { class: 'data-table-wrap' }, el('table', { class: 'data-table' }, [
        el('thead', {}, el('tr', {}, [
            el('th', { text: t('payouts.col.id') }),
            el('th', { text: t('payouts.col.chain') }),
            el('th', { text: t('payouts.col.to') }),
            el('th', { class: 'num', text: t('payouts.col.amount') }),
            el('th', { text: t('payouts.col.status') }),
            el('th', { text: t('payouts.col.when') }),
        ])),
        el('tbody', {}, rows.map(r => el('tr', {}, [
            el('td', { class: 'cell-no', text: r.id }),
            el('td', {}, el('span', { class: `chain-badge chain-badge--${r.chain}`, style: 'width:24px; height:24px; font-size:11px;', text: r.chain[0] })),
            el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mid);', text: r.to }),
            el('td', { class: 'num' }, [fmt.money(r.amount, 2), ' ', el('span', { class: 'muted', text: r.asset })]),
            el('td', {}, el('span', { class: `pill pill--${STATUS[r.status] || 'neutral'}`, text: r.status })),
            el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: fmt.time(r.requestedAt) }),
        ]))),
    ]));
    root.appendChild(sectionCard({ index: '01', title: t('payouts.section') }, tbl));

    root.appendChild(el('div', { class: 'alert alert--info', style: 'margin-top:16px;' }, [
        el('strong', { text: t('soon.label') + ': ' }),
        t('soon.payouts.body'),
    ]));
}
