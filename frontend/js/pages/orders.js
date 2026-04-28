// =============================================================================
// pages/orders.js — Invoice Orders: KPI strip + table + create / detail modals.
// =============================================================================

import { Api } from '../../api.js';
import { $, el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard, statusPill, toast, showError } from '../ui.js';
import { navigate, getCurrentRoute } from '../router.js';
import { openOrderDetail } from './order-detail.js';

export async function renderOrders(root) {
    clear(root);

    root.appendChild(pageHero({
        eyebrow: t('page.orders.eyebrow'),
        title:   t('page.orders.title'),
        sub:     t('page.orders.sub'),
        actions: [
            el('button', { class: 'btn btn--primary', text: t('orders.new'), onclick: openCreateOrderModal }),
        ],
    }));

    const page = await Api.listOrders({ limit: 100 });
    const orders = page.data || [];

    root.appendChild(kpiStrip(orders));
    root.appendChild(sectionCard({ index: '01', title: t('orders.table.title') }, ordersTable(orders)));
}

function kpiStrip(orders) {
    const counts = {
        all:      orders.length,
        open:     orders.filter(o => ['CREATED','PENDING_PAYMENT','PAID'].includes(o.status)).length,
        settled:  orders.filter(o => o.status === 'SETTLED').length,
        refunded: orders.filter(o => ['REFUNDING','REFUNDED'].includes(o.status)).length,
    };
    const tile = (variant, label, value, meta, hero = false) => el('div', { class: hero ? 'kpi-tile kpi-tile--hero' : 'kpi-tile' }, [
        el('div', { class: 'kpi-label' }, [el('span', { class: `kpi-dot kpi-dot--${variant}` }), label]),
        el('div', { class: 'kpi-value', text: value }),
        el('div', { class: 'kpi-meta', text: meta }),
    ]);
    return el('div', { class: 'kpi-strip' }, [
        tile('brass',   t('orders.kpi.all'),     fmt.int(counts.all),     t('orders.kpi.all.meta'), true),
        tile('warn',    t('orders.kpi.open'),    fmt.int(counts.open),    t('orders.kpi.open.meta')),
        tile('success', t('orders.kpi.settled'), fmt.int(counts.settled), t('orders.kpi.settled.meta')),
        tile('info',    t('orders.kpi.refunds'), fmt.int(counts.refunded),t('orders.kpi.refunds.meta')),
    ]);
}

function ordersTable(orders) {
    const wrap = el('div', { class: 'data-table-wrap' });
    if (orders.length === 0) {
        wrap.appendChild(el('div', { class: 'empty' }, [
            el('strong', { text: t('orders.empty.head') }),
            t('orders.empty.body'),
        ]));
        return wrap;
    }
    wrap.appendChild(el('table', { class: 'data-table' }, [
        el('thead', {}, el('tr', {}, [
            el('th', { text: t('orders.col.order') }),
            el('th', { text: t('orders.col.quote') }),
            el('th', { text: t('orders.col.settle') }),
            el('th', { text: t('orders.col.channel') }),
            el('th', { text: t('orders.col.status') }),
            el('th', { text: t('orders.col.time') }),
            el('th', { style: 'text-align:right;', text: t('orders.col.actions') }),
        ])),
        el('tbody', {}, orders.map(orderRow)),
    ]));
    return wrap;
}

function orderRow(o) {
    return el('tr', {
        style: 'cursor:pointer;',
        onclick: () => openOrderDetail(o.id),
    }, [
        el('td', {}, [
            el('div', { class: 'cell-no', text: o.merchantOrderNo }),
            el('div', { class: 'cell-id mono', text: fmt.short(o.id) }),
        ]),
        el('td', { class: 'num' }, [fmt.money(o.quoteAmount, 2), ' ', el('span', { class: 'muted', text: o.quoteAsset })]),
        el('td', { class: 'num' }, [
            o.settleAmount ? fmt.money(o.settleAmount) : '—', ' ',
            el('span', { class: 'muted', text: o.settleAsset || '' }),
        ]),
        el('td', {}, el('span', { class: 'pill pill--neutral', text: o.paymentChannel || 'CRYPTO' })),
        el('td', {}, statusPill(o.status)),
        el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: fmt.time(o.createdAt) }),
        el('td', { class: 'cell-actions' }, orderActionButtons(o)),
    ]);
}

function orderActionButtons(o) {
    const stop = (fn) => (ev) => { ev.stopPropagation(); fn(); };
    const btns = [];
    btns.push(el('button', {
        class: 'btn btn--tiny btn--ghost',
        text: t('orders.detail.action.view'),
        onclick: stop(() => openOrderDetail(o.id)),
    }));
    if (o.status === 'PENDING_PAYMENT') {
        btns.push(el('button', { class: 'btn btn--tiny', text: t('orders.action.markPaid'), onclick: stop(() => orderAction('markPaid', o.id)) }));
    }
    if (o.status === 'PAID') {
        btns.push(el('button', { class: 'btn btn--tiny btn--primary', text: t('orders.action.settle'), onclick: stop(() => orderAction('settle', o.id)) }));
    }
    if (['SETTLED','REFUNDING'].includes(o.status)) {
        btns.push(el('button', { class: 'btn btn--tiny', text: t('orders.action.refund'), onclick: stop(() => orderAction('refund', o.id)) }));
    }
    if (['CREATED','PENDING_PAYMENT','PAID'].includes(o.status)) {
        btns.push(el('button', { class: 'btn btn--tiny btn--ghost', text: t('orders.action.cancel'), onclick: stop(() => orderAction('cancel', o.id)) }));
    }
    return btns;
}

async function orderAction(kind, id) {
    try {
        if (kind === 'markPaid') {
            await Api.markOrderPaid(id);
            toast(t('orders.toast.markPaid'), 'ok');
        } else if (kind === 'settle') {
            await Api.settleOrder(id);
            toast(t('orders.toast.settle'), 'ok');
        } else if (kind === 'cancel') {
            const reason = prompt(t('orders.cancel.prompt')) || '';
            await Api.cancelOrder(id, reason);
            toast(t('orders.toast.cancel'), 'ok');
        } else if (kind === 'refund') {
            const amount = prompt(t('orders.refund.prompt'));
            if (!amount) return;
            await Api.refundOrder(id, amount, '');
            toast(t('orders.toast.refund'), 'ok');
        }
        navigate(getCurrentRoute(), { force: true, skipPush: true });
    } catch (err) {
        showError(err);
    }
}

// ---------------------------------------------------------------------------
// Create-order modal — bound once on bootstrap.
// ---------------------------------------------------------------------------
export function openCreateOrderModal() {
    const modal = $('#modal-create-order');
    modal.classList.remove('hidden');
    $('#create-order-form [name=merchantOrderNo]').value =
        `ORD-${new Date().toISOString().slice(0,10)}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

export function bindCreateOrderForm() {
    const form = $('#create-order-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        const payload = {
            merchantOrderNo: fd.get('merchantOrderNo').trim(),
            quoteAsset:      fd.get('quoteAsset'),
            quoteAmount:     fd.get('quoteAmount'),
            settleAsset:     fd.get('settleAsset'),
            settleAmount:    fd.get('settleAmount'),
            paymentChannel:  fd.get('paymentChannel'),
            expiresAt:       expires.toISOString(),
            description:     fd.get('description') || '',
        };
        try {
            await Api.createOrder(payload);
            $('#modal-create-order').classList.add('hidden');
            ev.target.reset();
            toast(t('orders.modal.toast'), 'ok');
            const cur = getCurrentRoute();
            if (cur === 'orders' || cur === 'overview') {
                navigate(cur, { force: true, skipPush: true });
            } else {
                navigate('orders');
            }
        } catch (err) {
            showError(err);
        }
    });
}
