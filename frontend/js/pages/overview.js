// =============================================================================
// pages/overview.js — Treasury Overview: KPI strip + balances + recent orders.
// =============================================================================

import { Api } from '../../api.js';
import { el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard, statusPill } from '../ui.js';
import { openCreateOrderModal } from './orders.js';

const STABLE_ASSETS = ['USDC-POLYGON', 'USDC-ETH', 'USDT-BSC', 'USDT-TRC20'];

export async function renderOverview(root) {
    clear(root);

    root.appendChild(pageHero({
        eyebrow: t('page.overview.eyebrow'),
        title:   t('page.overview.title'),
        sub:     t('page.overview.sub'),
        actions: [
            el('button', {
                class: 'btn btn--primary',
                text: t('orders.new'),
                onclick: openCreateOrderModal,
            }),
        ],
    }));

    const [accountsRes, ordersRes] = await Promise.allSettled([
        Api.listAccounts(),
        Api.listOrders({ limit: 10 }),
    ]);
    const accounts = accountsRes.status === 'fulfilled' ? accountsRes.value : [];
    const orders   = (ordersRes.status === 'fulfilled' ? ordersRes.value.data : []) || [];

    const sumByType = (type) => accounts
        .filter(a => STABLE_ASSETS.includes(a.assetCode) && a.accountType === type)
        .reduce((s, a) => s + Number(a.balance || 0), 0);

    const availableTotal = sumByType('AVAILABLE');
    const pendingTotal   = sumByType('PENDING');
    const ordersOpen    = orders.filter(o => ['CREATED','PENDING_PAYMENT','PAID','REFUNDING'].includes(o.status)).length;
    const ordersSettled = orders.filter(o => o.status === 'SETTLED').length;

    root.appendChild(el('div', { class: 'kpi-strip' }, [
        kpiHero(t('overview.kpi.available'), fmt.money(availableTotal, 2), t('overview.kpi.available.meta')),
        kpiTile('warn',    t('overview.kpi.pending'), fmt.money(pendingTotal, 2), t('overview.kpi.pending.meta')),
        kpiTile('info',    t('overview.kpi.open'),    fmt.int(ordersOpen),  t('overview.kpi.open.meta')),
        kpiTile('success', t('overview.kpi.settled'), fmt.int(ordersSettled), t('overview.kpi.settled.meta')),
    ]));

    const cols = el('div', { style: 'display:grid; grid-template-columns: 1.2fr 1fr; gap: 24px; align-items: start;' });
    cols.appendChild(sectionCard({
        index: '01',
        title: t('overview.balances.title'),
        action: el('a', { href: '#vault', class: 'btn btn--small btn--ghost', text: t('overview.balances.action') }),
    }, balancesBlock(accounts)));
    cols.appendChild(sectionCard({
        index: '02',
        title: t('overview.recent.title'),
        action: el('a', { href: '#orders', class: 'btn btn--small btn--ghost', text: t('overview.recent.action') }),
    }, recentOrdersBlock(orders)));
    root.appendChild(cols);
}

function kpiHero(label, value, meta) {
    return el('div', { class: 'kpi-tile kpi-tile--hero' }, [
        el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--brass' }), label]),
        el('div', { class: 'kpi-value', text: value }),
        el('div', { class: 'kpi-meta', text: meta }),
    ]);
}

function kpiTile(variant, label, value, meta) {
    return el('div', { class: 'kpi-tile' }, [
        el('div', { class: 'kpi-label' }, [el('span', { class: `kpi-dot kpi-dot--${variant}` }), label]),
        el('div', { class: 'kpi-value', text: value }),
        el('div', { class: 'kpi-meta', text: meta }),
    ]);
}

function balancesBlock(accounts) {
    const wrap = el('div', { style: 'padding: 18px 24px 24px;' });
    if (accounts.length === 0) {
        wrap.appendChild(el('div', { class: 'empty', text: '—' }));
        return wrap;
    }
    const byAsset = {};
    for (const a of accounts) (byAsset[a.assetCode] ||= []).push(a);
    const grid = el('div', { class: 'balances-grid' });
    for (const [asset, list] of Object.entries(byAsset)) {
        grid.appendChild(balanceCard(asset, list));
    }
    wrap.appendChild(grid);
    return wrap;
}

export function balanceCard(asset, list) {
    const available = list.find(x => x.accountType === 'AVAILABLE');
    const pending   = list.find(x => x.accountType === 'PENDING');
    const settle    = list.find(x => x.accountType === 'SETTLEMENT');
    return el('div', { class: 'balance-card' }, [
        el('div', { class: 'balance-card-head' }, [el('span', { class: 'asset-chip', text: asset })]),
        el('div', { class: 'balance-card-amount', text: available ? fmt.money(available.balance) : '—' }),
        el('div', { class: 'balance-card-label', text: 'AVAILABLE' }),
        el('ul', { class: 'balance-breakdown' }, [
            el('li', {}, [el('span', { class: 'bd-key', text: 'Pending' }),    el('span', { class: 'bd-val', text: fmt.money(pending?.balance || 0) })]),
            el('li', {}, [el('span', { class: 'bd-key', text: 'Settlement' }), el('span', { class: 'bd-val', text: fmt.money(settle?.balance || 0) })]),
        ]),
    ]);
}

function recentOrdersBlock(orders) {
    const wrap = el('div', { class: 'data-table-wrap' });
    if (orders.length === 0) {
        wrap.appendChild(el('div', { class: 'empty' }, [
            el('strong', { text: t('overview.recent.empty.head') }),
            t('overview.recent.empty.body'),
        ]));
        return wrap;
    }
    wrap.appendChild(el('table', { class: 'data-table' }, [
        el('thead', {}, el('tr', {}, [
            el('th', { text: t('orders.col.order') }),
            el('th', { text: t('orders.col.quote') }),
            el('th', { text: t('orders.col.status') }),
            el('th', { text: t('orders.col.time') }),
        ])),
        el('tbody', {}, orders.slice(0, 6).map(o => el('tr', {}, [
            el('td', {}, [
                el('div', { class: 'cell-no', text: o.merchantOrderNo }),
                el('div', { class: 'cell-id mono', text: fmt.short(o.id) }),
            ]),
            el('td', { class: 'num' }, [fmt.money(o.quoteAmount, 2), ' ', el('span', { class: 'muted', text: o.quoteAsset })]),
            el('td', {}, statusPill(o.status)),
            el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: fmt.time(o.createdAt) }),
        ]))),
    ]));
    return wrap;
}
