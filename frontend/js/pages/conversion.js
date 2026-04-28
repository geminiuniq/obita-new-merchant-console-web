// =============================================================================
// pages/conversion.js — Conversion mock page (swap form + rate card).
// =============================================================================

import { el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard, toast } from '../ui.js';

const MOCK_RATES = {
    'USDC-POLYGON→USDT-TRC20': '0.99975',
    'USDT-TRC20→USDC-POLYGON': '0.99970',
    'USDC-POLYGON→USDC-ETH':   '0.99800',
    'USDC-ETH→USDC-POLYGON':   '0.99812',
    'USDT-BSC→USDC-POLYGON':   '0.99955',
    'USDC-POLYGON→USDT-BSC':   '0.99955',
};

export function renderConversion(root) {
    clear(root);

    root.appendChild(pageHero({
        eyebrow: 'OBITA · CONVERSION',
        title: t('soon.conversion.title'),
        sub: t('conversion.sub'),
    }));

    // Swap form
    const fromAsset = select('fromAsset', ['USDC-POLYGON', 'USDC-ETH', 'USDT-BSC', 'USDT-TRC20']);
    const toAsset   = select('toAsset',   ['USDT-TRC20', 'USDC-POLYGON', 'USDC-ETH', 'USDT-BSC']);
    const amountIn  = el('input', { type: 'number', name: 'amount', min: '0', step: '0.000001', value: '100', required: 'required' });

    const rateNode  = el('div', { class: 'mono', style: 'font-size:18px; color:var(--ink-strong); font-weight:600;', text: '—' });
    const outNode   = el('div', { class: 'mono', style: 'font-size:18px; color:var(--ink-strong); font-weight:600;', text: '—' });
    const feeNode   = el('div', { class: 'mono', style: 'font-size:13px; color:var(--ink-mute);', text: '—' });

    function updateQuote() {
        const a = fromAsset.value;
        const b = toAsset.value;
        if (a === b) {
            rateNode.textContent = '—';
            outNode.textContent  = '—';
            feeNode.textContent  = t('conversion.same');
            return;
        }
        const key = `${a}→${b}`;
        const rate = MOCK_RATES[key] || '0.99800';
        const amt = Number(amountIn.value || '0');
        const out = amt * Number(rate);
        const fee = amt * 0.0010;
        rateNode.textContent = `1 ${a} ≈ ${rate} ${b}`;
        outNode.textContent  = `${fmt.money(out)} ${b}`;
        feeNode.textContent  = `${t('conversion.fee')}: ${fmt.money(fee)} ${a} (0.10%)`;
    }
    fromAsset.addEventListener('change', updateQuote);
    toAsset.addEventListener('change', updateQuote);
    amountIn.addEventListener('input', updateQuote);

    const swapForm = el('form', { class: 'form', style: 'padding: 24px; max-width: 720px;' }, [
        el('div', { class: 'form-row' }, [
            field(t('conversion.from'),   fromAsset),
            field(t('conversion.to'),     toAsset),
        ]),
        field(t('conversion.amount'), amountIn),
        el('div', {
            style: `
                display:grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px 24px;
                padding: 18px;
                border-radius: var(--radius-md);
                background: var(--surface-quiet);
                border: 1px solid var(--line-base);
            `,
        }, [
            el('div', {}, [el('div', { class: 'bd-key', text: t('conversion.rate') }), rateNode]),
            el('div', {}, [el('div', { class: 'bd-key', text: t('conversion.receive') }), outNode]),
            el('div', { style: 'grid-column: span 2;' }, [feeNode]),
        ]),
        el('div', { style: 'display:flex; gap:10px; align-items:center; margin-top: 4px;' }, [
            el('button', {
                type: 'submit',
                class: 'btn btn--primary',
                text: t('conversion.submit'),
            }),
            el('span', { class: 'pill pill--neutral', text: t('soon.label') }),
        ]),
    ]);
    swapForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        toast(t('conversion.toast'), 'info', 2200);
    });

    root.appendChild(sectionCard({ index: '01', title: t('conversion.section') }, swapForm));

    // Recent conversions (mock)
    const rows = [
        { from: 'USDC-POLYGON', to: 'USDT-TRC20', amount: '500', received: '499.875',  rate: '0.99975', when: '2026-04-29T07:30:00Z', status: 'COMPLETED' },
        { from: 'USDT-BSC',     to: 'USDC-POLYGON', amount: '120', received: '119.946', rate: '0.99955', when: '2026-04-28T14:18:00Z', status: 'COMPLETED' },
    ];
    const tbl = el('div', { class: 'data-table-wrap' }, el('table', { class: 'data-table' }, [
        el('thead', {}, el('tr', {}, [
            el('th', { text: t('conversion.col.pair') }),
            el('th', { text: t('conversion.col.amount') }),
            el('th', { text: t('conversion.col.received') }),
            el('th', { text: t('conversion.col.rate') }),
            el('th', { text: t('conversion.col.when') }),
            el('th', { text: t('conversion.col.status') }),
        ])),
        el('tbody', {}, rows.map(r => el('tr', {}, [
            el('td', {}, [
                el('span', { class: 'asset-chip', text: r.from }), ' → ',
                el('span', { class: 'asset-chip', text: r.to }),
            ]),
            el('td', { class: 'mono num', text: `${fmt.money(r.amount)} ${r.from}` }),
            el('td', { class: 'mono num', text: `${fmt.money(r.received)} ${r.to}` }),
            el('td', { class: 'mono num', text: r.rate }),
            el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: fmt.time(r.when) }),
            el('td', {}, el('span', { class: 'pill pill--success', text: r.status })),
        ]))),
    ]));
    root.appendChild(sectionCard({ index: '02', title: t('conversion.history') }, tbl));

    root.appendChild(el('div', { class: 'alert alert--info', style: 'margin-top:16px;' }, [
        el('strong', { text: t('soon.label') + ': ' }),
        t('soon.conversion.body'),
    ]));

    updateQuote();
}

// helpers
function field(label, control) {
    return el('label', { class: 'field' }, [
        el('span', { class: 'field-label', text: label }),
        control,
    ]);
}
function select(name, values) {
    return el('select', { name }, values.map(v => el('option', { value: v, text: v })));
}
