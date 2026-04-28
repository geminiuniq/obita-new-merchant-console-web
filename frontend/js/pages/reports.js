// =============================================================================
// pages/reports.js — Report Center mock page (download list).
// =============================================================================

import { Api } from '../../api.js';
import { el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { pageHero, sectionCard, toast } from '../ui.js';

export function renderReports(root) {
    clear(root);

    root.appendChild(pageHero({
        eyebrow: 'OBITA · REPORT CENTER',
        title: t('soon.reports.title'),
        sub: t('reports.sub'),
        actions: [
            el('a', {
                href: `${Api.baseUrl()}/v3/api-docs`,
                target: '_blank',
                rel: 'noopener',
                class: 'btn btn--ghost',
                text: 'OpenAPI JSON ↗',
            }),
            el('a', {
                href: `${Api.baseUrl()}/swagger-ui.html`,
                target: '_blank',
                rel: 'noopener',
                class: 'btn btn--primary',
                text: 'Swagger UI ↗',
            }),
        ],
    }));

    // Available reports — three editorial cards in a grid
    const cards = [
        {
            tag:  'reports.card.balance.tag',
            title:'reports.card.balance.title',
            sub:  'reports.card.balance.sub',
            cta:  'reports.card.cta',
        },
        {
            tag:  'reports.card.orders.tag',
            title:'reports.card.orders.title',
            sub:  'reports.card.orders.sub',
            cta:  'reports.card.cta',
        },
        {
            tag:  'reports.card.ledger.tag',
            title:'reports.card.ledger.title',
            sub:  'reports.card.ledger.sub',
            cta:  'reports.card.cta',
        },
    ];
    const grid = el('div', {
        style: 'display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; padding:24px;',
    });
    for (const c of cards) grid.appendChild(reportCard(c));
    root.appendChild(sectionCard({ index: '01', title: t('reports.section.available') }, grid));

    root.appendChild(el('div', { class: 'alert alert--info', style: 'margin-top:16px;' }, [
        el('strong', { text: t('soon.label') + ': ' }),
        t('soon.reports.body'),
    ]));
}

function reportCard({ tag, title, sub, cta }) {
    return el('div', { class: 'balance-card' }, [
        el('div', { class: 'balance-card-head' }, [
            el('span', { class: 'asset-chip', text: t(tag) }),
        ]),
        el('div', { style: 'font-family: var(--font-display); font-size:18px; font-weight:600; color: var(--ink-strong); letter-spacing:-0.005em; margin-top:4px;', text: t(title) }),
        el('p', { class: 'balance-card-label', style: 'margin-top:8px; line-height:1.55; text-transform:none; letter-spacing:0; font-family:var(--font-sans); font-size:12.5px;', text: t(sub) }),
        el('button', {
            class: 'btn btn--small',
            style: 'margin-top: 14px; width: 100%;',
            text: t(cta),
            onclick: () => toast(t('reports.toast'), 'info', 2200),
        }),
    ]);
}
