// =============================================================================
// pages/order-detail.js — Order detail modal.
// Wired to GET /v1/orders/{id} + GET /v1/orders/{id}/events.
// =============================================================================

import { Api } from '../../api.js';
import { $, el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { statusPill } from '../ui.js';

export async function openOrderDetail(id) {
    const modal = $('#modal-order-detail');
    const body  = $('#m-detail-body');
    const title = $('#m-detail-title');
    title.textContent = t('orders.detail.title');
    clear(body);
    body.appendChild(el('div', { class: 'empty', text: t('common.loading') }));
    modal.classList.remove('hidden');

    try {
        const [order, events] = await Promise.all([
            Api.getOrder(id),
            Api.getOrderEvents(id).catch(() => []),
        ]);
        renderOrderDetail(body, order, events);
    } catch (err) {
        clear(body);
        body.appendChild(el('div', { class: 'alert alert--error', text: err.message || String(err) }));
    }
}

function renderOrderDetail(body, o, events) {
    clear(body);

    const kv = (k, v) => el('div', {}, [
        el('div', { class: 'bd-key', style: 'margin-bottom:4px;', text: k }),
        el('div', { class: 'mono', style: 'color:var(--ink-strong); font-size:13px;', text: v ?? '—' }),
    ]);

    body.appendChild(el('div', {
        style: 'display:grid; grid-template-columns: 1fr 1fr; gap:16px 24px; padding:16px 4px 24px; border-bottom:1px solid var(--line-soft);',
    }, [
        kv(t('orders.detail.field.id'), fmt.short(o.id, 10, 8)),
        kv(t('orders.detail.field.no'), o.merchantOrderNo),
        el('div', {}, [
            el('div', { class: 'bd-key', style: 'margin-bottom:4px;', text: t('orders.detail.field.status') }),
            statusPill(o.status),
        ]),
        kv(t('orders.detail.field.channel'), o.paymentChannel || '—'),
        kv(t('orders.detail.field.quote'),   `${fmt.money(o.quoteAmount, 2)} ${o.quoteAsset || ''}`),
        kv(t('orders.detail.field.settle'),  o.settleAmount ? `${fmt.money(o.settleAmount)} ${o.settleAsset || ''}` : '—'),
        kv(t('orders.detail.field.created'), fmt.time(o.createdAt)),
        kv(t('orders.detail.field.updated'), fmt.time(o.updatedAt)),
        kv(t('orders.detail.field.expires'), fmt.time(o.expiresAt)),
        o.description ? kv(t('orders.detail.field.desc'), o.description) : null,
    ]));

    body.appendChild(el('h4', {
        style: 'margin: 18px 0 12px; font-family: var(--font-display); font-size:14px; font-weight:600; color: var(--ink-strong); display:flex; align-items:center; gap:10px;',
    }, [
        el('span', { class: 'idx-pill', text: '02' }),
        t('orders.detail.section.events'),
    ]));

    const list = events || [];
    if (list.length === 0) {
        body.appendChild(el('div', { class: 'empty', style: 'padding:24px 0;', text: '—' }));
        return;
    }
    const timeline = el('ol', {
        style: 'list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;',
    });
    for (const ev of list) {
        timeline.appendChild(el('li', {
            style: 'display:grid; grid-template-columns: 24px 1fr auto; align-items:start; gap:12px; padding:10px 0; border-bottom:1px solid var(--line-soft);',
        }, [
            el('span', { style: 'width:8px; height:8px; border-radius:999px; background: var(--clr-brand-brass); margin-top:7px;' }),
            el('div', {}, [
                el('div', { style: 'font-weight:600; color:var(--ink-strong); font-size:13px;', text: ev.eventType || ev.type || '—' }),
                ev.fromStatus || ev.toStatus ? el('div', { class: 'mono', style: 'font-size:12px; color:var(--ink-mute); margin-top:2px;', text: `${ev.fromStatus || '·'}  →  ${ev.toStatus || '·'}` }) : null,
                ev.memo ? el('div', { style: 'font-size:12px; color:var(--ink-mid); margin-top:4px;', text: ev.memo }) : null,
            ]),
            el('span', { class: 'mono', style: 'font-size:11px; color:var(--ink-mute);', text: fmt.time(ev.createdAt || ev.occurredAt) }),
        ]));
    }
    body.appendChild(timeline);
}
