// =============================================================================
// pages/vault.js — Stablecoin Vault: balances + address book + provision +
// mock-bank credit injection.
// =============================================================================

import { Api } from '../../api.js';
import { el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard, toast, showError } from '../ui.js';
import { navigate, pollCurrentRoute } from '../router.js';
import { balanceCard } from './overview.js';
import { openWalletHistory } from './wallet-history.js';

const STABLE_ASSETS = ['USDC-POLYGON', 'USDC-ETH', 'USDT-BSC', 'USDT-TRC20'];

export async function renderVault(root) {
    clear(root);

    root.appendChild(pageHero({
        eyebrow: t('page.vault.eyebrow'),
        title:   t('page.vault.title'),
        sub:     t('page.vault.sub'),
    }));

    const [accounts, addresses] = await Promise.all([
        Api.listAccounts().catch(() => []),
        Api.listAddresses().catch(() => []),
    ]);

    root.appendChild(sectionCard({ index: '01', title: t('vault.balances.title') },
        balancesGrid(accounts)));
    root.appendChild(sectionCard({ index: '02', title: t('vault.address.title') },
        addressBook(addresses)));
    root.appendChild(sectionCard({ index: '03', title: t('vault.mock.title') },
        mockBankSection(addresses)));
}

function balancesGrid(accounts) {
    const grid = el('div', { class: 'balances-grid', style: 'padding: 24px;' });
    for (const asset of STABLE_ASSETS) {
        grid.appendChild(balanceCard(asset, accounts.filter(a => a.assetCode === asset)));
    }
    return grid;
}

function addressBook(addresses) {
    const wrap = el('div', { style: 'padding: 20px 24px 24px;' });
    const cards = el('div', { class: 'addr-cards' });
    if (addresses.length === 0) {
        cards.appendChild(el('div', { class: 'addr-empty-tile' }, [
            el('div', { style: 'font-size:24px;color:var(--ink-quiet);', text: '◇' }),
            el('div', { style: 'font-weight:600;color:var(--ink-base);', text: t('vault.address.empty') }),
            el('div', { class: 'muted', style: 'font-size:12px;', text: t('vault.address.empty.sub') }),
        ]));
    } else {
        for (const a of addresses) cards.appendChild(addressCard(a));
    }
    wrap.appendChild(cards);
    wrap.appendChild(provisionForm());
    return wrap;
}

function addressCard(a) {
    const chain = a.chainId || 'OTHER';
    const card = el('div', {
        class: 'addr-card',
        style: 'cursor:pointer;',
    }, [
        el('div', { class: 'addr-card-head' }, [
            el('div', { class: `chain-badge chain-badge--${chain}`, text: (chain[0] || '?') }),
            el('div', { style: 'min-width:0; flex:1;' }, [
                el('div', { class: 'addr-card-title', text: a.label || `${chain}` }),
                el('div', { style: 'display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;' }, [
                    el('span', { class: 'pill pill--neutral', text: chain }),
                    el('span', { class: 'pill pill--success', text: a.purpose || 'DEPOSIT' }),
                ]),
            ]),
        ]),
        el('div', { class: 'addr-card-value', text: a.address }),
        el('div', { class: 'addr-card-foot' }, [
            el('button', {
                class: 'btn btn--small btn--ghost',
                text: t('vault.address.copy'),
                onclick: (ev) => {
                    ev.stopPropagation();
                    navigator.clipboard.writeText(a.address)
                        .then(() => toast(t('vault.address.copied'), 'ok', 1200));
                },
            }),
            el('button', {
                class: 'btn btn--small btn--ghost',
                text: t('vault.address.history'),
                onclick: (ev) => {
                    ev.stopPropagation();
                    openWalletHistory(a);
                },
            }),
            el('span', { class: 'muted', style: 'font-size:11px; margin-left:auto; font-family:var(--font-mono);', text: fmt.short(a.address, 6, 6) }),
        ]),
    ]);
    card.addEventListener('click', () => openWalletHistory(a));
    return card;
}

function provisionForm() {
    const form = el('form', { class: 'form', style: 'padding: 20px 0 0; border-top: 1px solid var(--line-soft); margin-top: 20px;' }, [
        el('div', { class: 'eyebrow-brass', style: 'margin-bottom:8px;', text: t('vault.provision.title') }),
        el('div', { class: 'form-row' }, [
            field(t('vault.provision.chain'), select('chainId', ['POLYGON', 'ETH', 'BSC', 'TRON'])),
            field(t('vault.provision.purpose'), select('purpose', ['DEPOSIT', 'SETTLEMENT', 'HOT'])),
        ]),
        el('div', { class: 'form-row' }, [
            field(t('vault.provision.label'), el('input', { type: 'text', name: 'label', value: 'Main', maxlength: '64' })),
            el('div', { style: 'display:flex; align-items:flex-end;' }, [
                el('button', { type: 'submit', class: 'btn btn--primary', style: 'width: 100%;', text: t('vault.provision.submit') }),
            ]),
        ]),
    ]);
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        try {
            const addr = await Api.provisionAddress({
                chainId: fd.get('chainId'),
                purpose: fd.get('purpose'),
                label:   fd.get('label') || null,
            });
            toast(`${t('vault.address.provisioned')} (${addr.chainId})`, 'ok');
            navigate('vault', { force: true, skipPush: true });
        } catch (err) {
            showError(err);
        }
    });
    return form;
}

function mockBankSection(addresses) {
    return el('div', { style: 'padding: 24px;' }, [
        el('div', { class: 'alert alert--info', style: 'margin-bottom: 18px;' }, [
            el('strong', { text: t('vault.mock.note.lead') }),
            t('vault.mock.note'),
        ]),
        mockBankForm(addresses),
    ]);
}

function mockBankForm(addresses) {
    const toSelect = el('select', { name: 'toAddress', required: 'required' });
    if (addresses.length === 0) {
        toSelect.appendChild(el('option', { value: '', text: '— ' + t('vault.address.empty') + ' —' }));
    } else {
        for (const a of addresses) {
            toSelect.appendChild(el('option', {
                value: a.address,
                text: `${a.chainId} · ${fmt.short(a.address, 6, 6)} · ${a.purpose}`,
            }));
        }
    }
    const form = el('form', { class: 'form' }, [
        el('div', { class: 'form-row' }, [
            field(t('vault.mock.to'),    toSelect),
            field(t('vault.mock.asset'), select('asset', ['USDC-POLYGON', 'USDC-ETH', 'USDT-BSC', 'USDT-TRC20'])),
        ]),
        el('div', { class: 'form-row' }, [
            field(t('vault.mock.amount'), el('input', { type: 'number', name: 'amount', min: '0', step: '0.000001', value: '500', required: 'required' })),
            el('div', { style: 'display:flex; align-items:flex-end;' }, [
                el('button', {
                    type: 'submit',
                    class: 'btn btn--ink',
                    style: 'width:100%;',
                    text: t('vault.mock.submit'),
                    disabled: addresses.length === 0 ? 'disabled' : null,
                }),
            ]),
        ]),
    ]);
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const toAddress = fd.get('toAddress');
        if (!toAddress) {
            toast(t('vault.address.empty'), 'error');
            return;
        }
        const chainId = (addresses.find(a => a.address === toAddress) || {}).chainId || 'POLYGON';
        try {
            await Api.mockBankCredit({
                chainId, asset: fd.get('asset'), toAddress, amount: fd.get('amount'),
            });
            toast(t('vault.mock.toast'), 'ok', 5000);
            pollCurrentRoute(60_000);
        } catch (err) {
            showError(err);
        }
    });
    return form;
}

// ---- tiny field helpers ---------------------------------------------------
function field(label, control) {
    return el('label', { class: 'field' }, [
        el('span', { class: 'field-label', text: label }),
        control,
    ]);
}
function select(name, values) {
    return el('select', { name }, values.map(v => el('option', { value: v, text: v })));
}
