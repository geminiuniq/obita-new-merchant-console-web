// =============================================================================
// pages/ledger.js — Ledger snapshot. Backend feed (per-tx entries) is P1.
// =============================================================================

import { Api } from '../../api.js';
import { el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard } from '../ui.js';

export async function renderLedger(root) {
    clear(root);

    root.appendChild(pageHero({
        eyebrow: t('page.ledger.eyebrow'),
        title:   t('page.ledger.title'),
        sub:     t('page.ledger.sub'),
    }));

    const accounts = await Api.listAccounts();
    const wrap = el('div', { class: 'data-table-wrap' });
    if (accounts.length === 0) {
        wrap.appendChild(el('div', { class: 'empty', text: '—' }));
    } else {
        const tbl = el('table', { class: 'data-table' });
        tbl.appendChild(el('thead', {}, el('tr', {}, [
            el('th', { text: t('ledger.col.no') }),
            el('th', { text: t('ledger.col.asset') }),
            el('th', { text: t('ledger.col.type') }),
            el('th', { class: 'num', text: t('ledger.col.balance') }),
            el('th', { text: t('ledger.col.note') }),
        ])));
        const tbody = el('tbody');
        accounts.forEach((a, i) => {
            const variant = a.accountType === 'AVAILABLE' ? 'success'
                          : a.accountType === 'PENDING'    ? 'warn'
                          : a.accountType === 'SETTLEMENT' ? 'info' : 'neutral';
            tbody.appendChild(el('tr', {}, [
                el('td', { class: 'mono', style: 'color:var(--ink-mute)', text: String(i + 1) }),
                el('td', {}, el('span', { class: 'asset-chip', text: a.assetCode })),
                el('td', {}, el('span', { class: `pill pill--${variant}`, text: a.accountType })),
                el('td', { class: 'num', text: fmt.money(a.balance) }),
                el('td', { class: 'muted', style: 'font-size:12px;', text: t('ledger.row.note') }),
            ]));
        });
        tbody.appendChild(el('tr', { class: 'ledger-note' }, el('td', { colspan: '5' }, [
            el('strong', { text: t('ledger.note.lead') }),
            t('ledger.note.body'),
            el('code', { text: 'SELECT * FROM ledger_entry ORDER BY id;' }),
            t('ledger.note.body2'),
        ])));
        tbl.appendChild(tbody);
        wrap.appendChild(tbl);
    }
    root.appendChild(sectionCard({ index: '01', title: t('ledger.section') }, wrap));
}
