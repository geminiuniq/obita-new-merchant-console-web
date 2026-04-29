// =============================================================================
// pages/payouts.js — Payouts: KPI strip + table wired to /v1/withdrawals,
//                    create modal + 4-eyes approve / reject row actions.
// =============================================================================

import { Api } from '../../api.js';
import { $, el, clear } from '../dom.js';
import { t } from '../i18n.js';
import { fmt } from '../format.js';
import { pageHero, sectionCard, statusPill, toast, showError } from '../ui.js';
import { navigate, getCurrentRoute } from '../router.js';

// ---------------------------------------------------------------------------
// Constants — kept aligned with WithdrawalStatus.java + AccountController.java.
// ---------------------------------------------------------------------------
const PENDING_STATES   = new Set(['REQUESTED', 'RISK_REVIEW']);
const APPROVED_STATES  = new Set(['APPROVED', 'SUBMITTED', 'CONFIRMING']);
const TERMINAL_DONE    = new Set(['COMPLETED']);
const TERMINAL_REJECT  = new Set(['REJECTED', 'FAILED']);

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
export async function renderPayouts(root) {
    clear(root);

    root.appendChild(pageHero({
        eyebrow: 'TCSP · PAYOUT ORDERS',
        title:   t('soon.payouts.title'),
        sub:     t('payouts.sub'),
        actions: [
            el('button', {
                class: 'btn btn--primary',
                text:  t('payouts.new'),
                onclick: openCreateWithdrawalModal,
            }),
        ],
    }));

    let rows = [];
    try {
        rows = await Api.listWithdrawals({ limit: 200 });
    } catch (err) {
        showError(err);
        rows = [];
    }

    root.appendChild(kpiStrip(rows));
    root.appendChild(sectionCard({ index: '01', title: t('payouts.section') }, payoutsTable(rows)));
}

function kpiStrip(rows) {
    const counts = {
        all:       rows.length,
        pending:   rows.filter(r => PENDING_STATES.has(r.status)).length,
        approved:  rows.filter(r => APPROVED_STATES.has(r.status)).length,
        confirmed: rows.filter(r => TERMINAL_DONE.has(r.status)).length,
    };
    const tile = (variant, label, value, meta, hero = false) => el('div', { class: hero ? 'kpi-tile kpi-tile--hero' : 'kpi-tile' }, [
        el('div', { class: 'kpi-label' }, [el('span', { class: `kpi-dot kpi-dot--${variant}` }), label]),
        el('div', { class: 'kpi-value', text: value }),
        el('div', { class: 'kpi-meta', text: meta }),
    ]);
    return el('div', { class: 'kpi-strip' }, [
        tile('brass',   t('payouts.kpi.all'),       fmt.int(counts.all),       t('payouts.kpi.all.meta'), true),
        tile('warn',    t('payouts.kpi.pending'),   fmt.int(counts.pending),   t('payouts.kpi.pending.meta')),
        tile('info',    t('payouts.kpi.approved'),  fmt.int(counts.approved),  t('payouts.kpi.approved.meta')),
        tile('success', t('payouts.kpi.confirmed'), fmt.int(counts.confirmed), t('payouts.kpi.confirmed.meta')),
    ]);
}

function payoutsTable(rows) {
    const wrap = el('div', { class: 'data-table-wrap' });
    if (rows.length === 0) {
        wrap.appendChild(el('div', { class: 'empty' }, [
            el('strong', { text: t('payouts.empty.head') }),
            t('payouts.empty.body'),
        ]));
        return wrap;
    }
    wrap.appendChild(el('table', { class: 'data-table' }, [
        el('thead', {}, el('tr', {}, [
            el('th', { text: t('payouts.col.id') }),
            el('th', { text: t('payouts.col.chain') }),
            el('th', { text: t('payouts.col.to') }),
            el('th', { class: 'num', text: t('payouts.col.amount') }),
            el('th', { text: t('payouts.col.status') }),
            el('th', { text: t('payouts.col.when') }),
            el('th', { style: 'text-align:right;', text: t('payouts.col.actions') }),
        ])),
        el('tbody', {}, rows.map(payoutRow)),
    ]));
    return wrap;
}

function payoutRow(w) {
    return el('tr', {}, [
        el('td', {}, [
            el('div', { class: 'cell-id mono', text: fmt.short(w.id) }),
            w.txHash ? el('div', { class: 'cell-id mono', style: 'color:var(--ink-mute);', text: fmt.short(w.txHash) }) : null,
        ]),
        el('td', {}, el('span', { class: `chain-badge chain-badge--${w.chainId}`, style: 'width:24px; height:24px; font-size:11px;', text: (w.chainId || '?')[0] })),
        el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mid);', text: maskAddress(w.toAddress) }),
        el('td', { class: 'num' }, [
            fmt.money(w.amount, 2), ' ',
            el('span', { class: 'muted', text: w.asset }),
        ]),
        el('td', {}, statusPill(w.status)),
        el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: fmt.time(w.requestedAt) }),
        el('td', { class: 'cell-actions' }, payoutActionButtons(w)),
    ]);
}

function payoutActionButtons(w) {
    const btns = [];
    if (PENDING_STATES.has(w.status)) {
        btns.push(el('button', {
            class: 'btn btn--tiny btn--primary',
            text:  t('payouts.action.approve'),
            onclick: () => withdrawalAction('approve', w.id),
        }));
        btns.push(el('button', {
            class: 'btn btn--tiny btn--ghost',
            text:  t('payouts.action.reject'),
            onclick: () => withdrawalAction('reject', w.id),
        }));
    }
    if (TERMINAL_REJECT.has(w.status) && w.failureMessage) {
        btns.push(el('span', { class: 'muted', style: 'font-size:11px;', text: w.failureMessage }));
    }
    return btns;
}

async function withdrawalAction(kind, id) {
    try {
        if (kind === 'approve') {
            if (!confirm(t('payouts.approve.confirm'))) return;
            await Api.approveWithdrawal(id);
            toast(t('payouts.toast.approved'), 'ok');
        } else if (kind === 'reject') {
            const reason = prompt(t('payouts.reject.prompt')) || '';
            await Api.rejectWithdrawal(id, reason);
            toast(t('payouts.toast.rejected'), 'ok');
        }
        navigate(getCurrentRoute(), { force: true, skipPush: true });
    } catch (err) {
        showError(err);
    }
}

function maskAddress(addr) {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

// ---------------------------------------------------------------------------
// Create-withdrawal modal — bound once at bootstrap (see app.js).
// ---------------------------------------------------------------------------
export function openCreateWithdrawalModal() {
    const modal = $('#modal-create-withdrawal');
    modal.classList.remove('hidden');
}

export function bindCreateWithdrawalForm() {
    const form = $('#create-withdrawal-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const payload = {
            chainId:   fd.get('chainId'),
            asset:     fd.get('asset'),
            amount:    fd.get('amount'),
            toAddress: (fd.get('toAddress') || '').trim(),
            // feeAmount intentionally omitted — backend defaults to zero.
        };
        try {
            await Api.createWithdrawal(payload);
            $('#modal-create-withdrawal').classList.add('hidden');
            ev.target.reset();
            toast(t('payouts.toast.created'), 'ok');
            const cur = getCurrentRoute();
            if (cur === 'payouts') {
                navigate(cur, { force: true, skipPush: true });
            } else {
                navigate('payouts');
            }
        } catch (err) {
            showError(err);
        }
    });
}
