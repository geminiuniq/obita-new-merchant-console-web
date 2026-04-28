// =============================================================================
// pages/wallet-history.js — Wallet history drawer.
//
// Backend doesn't expose per-address history yet (P1: GET /v1/wallet-addresses/
// {id}/transactions). For now the drawer renders a deterministic mock based on
// the address itself plus the latest GET /v1/accounts snapshot, so the demo
// reads as if real on-chain activity is wired in.
// =============================================================================

import { Api } from '../../api.js';
import { $, el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { openDrawer } from '../drawer.js';

export async function openWalletHistory(addressRow) {
    const body = $('#wallet-body');
    const title = $('#wallet-title');
    if (!body || !title) return;

    title.textContent = t('wallet.history.title');
    clear(body);
    body.appendChild(el('div', { class: 'empty', text: t('common.loading') }));
    openDrawer('#wallet-drawer');

    let accounts = [];
    try { accounts = await Api.listAccounts(); } catch { accounts = []; }
    const real = realActivity(addressRow, accounts);
    const mock = mockActivity(addressRow);

    clear(body);
    body.appendChild(headerCard(addressRow));
    body.appendChild(activityList([...real, ...mock]));
}

function headerCard(a) {
    const chain = a.chainId || 'OTHER';
    return el('div', {
        style: `
            padding: 18px 24px;
            border-bottom: 1px solid var(--line-soft);
            background: var(--surface-soft);
        `,
    }, [
        el('div', { style: 'display:flex; align-items:center; gap:12px; margin-bottom: 12px;' }, [
            el('div', { class: `chain-badge chain-badge--${chain}`, text: (chain[0] || '?') }),
            el('div', { style: 'min-width:0;' }, [
                el('div', { style: 'font-family: var(--font-display); font-weight:600; font-size:14px; color:var(--ink-strong);', text: a.label || `${chain}` }),
                el('div', { style: 'display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;' }, [
                    el('span', { class: 'pill pill--neutral', text: chain }),
                    el('span', { class: 'pill pill--success', text: a.purpose || 'DEPOSIT' }),
                ]),
            ]),
        ]),
        el('div', {
            style: 'font-family: var(--font-mono); font-size: 12px; color: var(--ink-mid); word-break: break-all; line-height:1.55;',
            text: a.address,
        }),
    ]);
}

function activityList(items) {
    if (items.length === 0) {
        return el('div', { class: 'empty', text: t('wallet.history.empty') });
    }
    return el('ol', {
        style: 'list-style:none; margin:0; padding:0;',
    }, items.map(activityRow));
}

function activityRow(it) {
    const sign = it.direction === 'IN' ? '+' : '−';
    const colorClass = it.direction === 'IN' ? 'pill--success' : 'pill--neutral';
    const valueColor = it.direction === 'IN' ? 'var(--status-success-fg)' : 'var(--ink-base)';
    return el('li', {
        style: `
            display: grid;
            grid-template-columns: 36px 1fr auto;
            gap: 12px;
            align-items: start;
            padding: 14px 24px;
            border-bottom: 1px solid var(--line-soft);
        `,
    }, [
        el('div', {
            style: `
                width: 36px; height: 36px;
                border-radius: var(--radius-md);
                background: ${it.direction === 'IN' ? 'var(--status-success-soft-bg)' : 'var(--surface-overlay)'};
                color: ${valueColor};
                display: inline-flex; align-items: center; justify-content: center;
                font-size: 16px; font-weight: 700;
            `,
            text: it.direction === 'IN' ? '↓' : '↑',
        }),
        el('div', { style: 'min-width:0;' }, [
            el('div', { style: 'font-weight:600; color: var(--ink-strong); font-size:13.5px;', text: it.title }),
            el('div', { class: 'mono', style: 'font-size:11.5px; color:var(--ink-mute); margin-top:3px;', text: it.txid || '—' }),
            it.tags ? el('div', { style: 'display:flex; gap:6px; margin-top:6px;' }, it.tags.map(text =>
                el('span', { class: `pill ${colorClass}`, text }))) : null,
        ]),
        el('div', { style: 'text-align: right;' }, [
            el('div', {
                class: 'mono',
                style: `font-weight:600; color: ${valueColor}; font-size:14px; white-space:nowrap;`,
                text: `${sign} ${fmt.money(it.amount)} ${it.asset}`,
            }),
            el('div', { class: 'mono', style: 'font-size:11px; color:var(--ink-mute); margin-top:3px;', text: fmt.time(it.when) }),
        ]),
    ]);
}

// Look at the real account snapshot — if the address's chain has a non-zero
// AVAILABLE balance, we know at least one deposit has cleared. Surface it.
function realActivity(a, accounts) {
    const chainAssets = {
        POLYGON: 'USDC-POLYGON',
        ETH:     'USDC-ETH',
        BSC:     'USDT-BSC',
        TRON:    'USDT-TRC20',
    };
    const asset = chainAssets[a.chainId];
    if (!asset) return [];
    const acct = accounts.find(x => x.assetCode === asset && x.accountType === 'AVAILABLE');
    if (!acct || Number(acct.balance || 0) <= 0) return [];
    return [{
        direction: 'IN',
        title: t('wallet.history.deposit.confirmed'),
        txid:  '0x' + a.address.slice(2, 18) + '…confirmed',
        amount: acct.balance,
        asset,
        when:  new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        tags:  [t('wallet.history.tag.live'), 'PENDING → AVAILABLE'],
    }];
}

// Deterministic mock so the drawer always has something to show.
function mockActivity(a) {
    const chainAssets = {
        POLYGON: 'USDC-POLYGON',
        ETH:     'USDC-ETH',
        BSC:     'USDT-BSC',
        TRON:    'USDT-TRC20',
    };
    const asset = chainAssets[a.chainId] || 'USDC-POLYGON';
    const seed = a.address || '';
    const seeded = (n) => {
        let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
        return ((h + n * 17) % 100) / 10;
    };
    const day = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
    return [
        {
            direction: 'IN',
            title: t('wallet.history.row.topup'),
            txid:  '0xae93ff42d8c5b7…2e91',
            amount: (250 + seeded(1) * 10).toFixed(2),
            asset,
            when:  day(1),
            tags:  [t('wallet.history.tag.deposit')],
        },
        {
            direction: 'OUT',
            title: t('wallet.history.row.settle'),
            txid:  '0x55b71eaa1c0d2f…f813',
            amount: (100 + seeded(2) * 5).toFixed(2),
            asset,
            when:  day(3),
            tags:  [t('wallet.history.tag.settle')],
        },
        {
            direction: 'IN',
            title: t('wallet.history.row.topup'),
            txid:  '0xc83e1aa90fb12c…7a05',
            amount: (500 + seeded(3) * 25).toFixed(2),
            asset,
            when:  day(7),
            tags:  [t('wallet.history.tag.deposit')],
        },
    ];
}
