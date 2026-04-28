// =============================================================================
// app.js — orchestrates the four demo flows:
//   1. Login (POST /v1/auth/login)
//   2. Balances (GET /v1/accounts)
//   3. Orders (GET / POST /v1/orders + state transitions)
//   4. Vault deposit (POST /v1/wallet-addresses + /mock-bank/credit)
//
// Rendering uses createElement / textContent rather than innerHTML so that any
// user-controlled string (merchant order number, descriptions) is escaped by
// default — no DOMPurify dependency required.
// =============================================================================

import { Api, ApiError } from './api.js';

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Create an element. `attrs` may include `class`, `text` (textContent),
 *  data-*, and event listeners as `on*` keys. `children` is an array of
 *  elements / strings (strings become text nodes). */
function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') throw new Error('use createElement instead of html');
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k.startsWith('data-')) node.setAttribute(k, v);
        else if (k === 'value') node.value = v;
        else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
        if (c == null || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
}

function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
}

const fmt = {
    money(v, decimals = 6) {
        if (v === null || v === undefined) return '—';
        const n = Number(v);
        return n.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
        });
    },
    short(s, head = 8, tail = 6) {
        if (!s) return '—';
        return s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
    },
    time(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleString();
    },
};

function toast(msg, kind = 'info', ms = 3500) {
    const t = $('#toast');
    t.className = `toast toast--${kind}`;
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), ms);
}

function showError(err) {
    const msg = err instanceof ApiError
        ? `${err.code}: ${err.message}`
        : (err?.message || String(err));
    toast(msg, 'error', 5000);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
$('#login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const errEl = $('#login-error');
    errEl.classList.add('hidden');
    try {
        await Api.login({
            merchantCode: fd.get('merchantCode').trim(),
            username:     fd.get('username').trim(),
            password:     fd.get('password'),
        });
        enterApp();
    } catch (err) {
        errEl.textContent = err instanceof ApiError ? err.message : String(err);
        errEl.classList.remove('hidden');
    }
});

$('#login-api-base').textContent = Api.baseUrl();

document.addEventListener('auth:expired', () => {
    toast('登录已过期，请重新登录', 'error');
    showLogin();
});

$('#btn-logout').addEventListener('click', () => {
    Api.clearSession();
    showLogin();
});

function showLogin() {
    $('#view-app').classList.add('hidden');
    $('#view-login').classList.remove('hidden');
}

async function enterApp() {
    const session = Api.loadSession();
    $('#meta-merchant-code').textContent = session.merchantCode || '—';
    $('#meta-user').textContent = session.username || '—';

    $('#view-login').classList.add('hidden');
    $('#view-app').classList.remove('hidden');

    await refreshAll();
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
$$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        $$('.tab').forEach(b => b.classList.toggle('tab--active', b === btn));
        $$('.tab-panel').forEach(p =>
            p.classList.toggle('tab-panel--active', p.dataset.panel === target)
        );
        if (target === 'ledger') refreshLedger();
    });
});

$('#btn-refresh').addEventListener('click', () => refreshAll());

async function refreshAll() {
    await Promise.allSettled([
        refreshBalances(),
        refreshOrders(),
        refreshAddresses(),
        refreshLedger(),
    ]);
}

// ---------------------------------------------------------------------------
// Balances panel
// ---------------------------------------------------------------------------
async function refreshBalances() {
    const grid = $('#balances-grid');
    clearChildren(grid);
    try {
        const accounts = await Api.listAccounts();
        if (!accounts.length) {
            grid.appendChild(el('div', { class: 'empty', text: '该商户尚未开通任何账户。' }));
            return;
        }
        const byAsset = {};
        for (const a of accounts) (byAsset[a.assetCode] ||= []).push(a);

        for (const [asset, list] of Object.entries(byAsset)) {
            const available = list.find(x => x.accountType === 'AVAILABLE');
            const others = list.filter(x => x.accountType !== 'AVAILABLE');

            const breakdown = el('ul', { class: 'balance-breakdown' },
                others.map(o => el('li', {}, [
                    el('span', { class: 'bd-key', text: o.accountType }),
                    el('span', { class: 'bd-val mono', text: fmt.money(o.balance) }),
                ]))
            );

            grid.appendChild(el('article', { class: 'balance-card' }, [
                el('div', { class: 'balance-card-asset', text: asset }),
                el('div', { class: 'balance-card-amount mono',
                            text: available ? fmt.money(available.balance) : '—' }),
                el('div', { class: 'balance-card-label', text: '可用余额' }),
                breakdown,
            ]));
        }
    } catch (err) {
        grid.appendChild(el('div', { class: 'alert alert--error', text: `加载失败：${err.message}` }));
    }
}

// ---------------------------------------------------------------------------
// Orders panel
// ---------------------------------------------------------------------------
async function refreshOrders() {
    const list = $('#orders-list');
    clearChildren(list);
    try {
        const page = await Api.listOrders({ limit: 50 });
        const orders = page.data || [];
        if (!orders.length) {
            list.appendChild(el('div', { class: 'empty', text: '还没有订单 — 点右上角"新建订单"。' }));
            return;
        }
        for (const o of orders) list.appendChild(renderOrderCard(o));
    } catch (err) {
        list.appendChild(el('div', { class: 'alert alert--error', text: `加载失败：${err.message}` }));
    }
}

function kv(key, valueChildren) {
    return el('div', { class: 'kv' }, [
        el('div', { class: 'kv-key', text: key }),
        el('div', { class: 'kv-val mono' }, valueChildren),
    ]);
}

function renderOrderCard(o) {
    const statusClass = `status--${o.status.toLowerCase()}`;
    const canMarkPaid = o.status === 'PENDING_PAYMENT';
    const canSettle   = o.status === 'PAID';
    const canCancel   = ['CREATED', 'PENDING_PAYMENT', 'PAID'].includes(o.status);
    const canRefund   = ['SETTLED', 'REFUNDING'].includes(o.status);

    const card = el('article', { class: 'order-card' });

    card.appendChild(el('header', { class: 'order-card-head' }, [
        el('div', {}, [
            el('div', { class: 'order-no mono', text: o.merchantOrderNo }),
            el('div', { class: 'order-id mono', text: fmt.short(o.id) }),
        ]),
        el('span', { class: `status-pill ${statusClass}`, text: o.status }),
    ]));

    card.appendChild(el('div', { class: 'order-card-grid' }, [
        kv('报价', [
            fmt.money(o.quoteAmount, 2),
            ' ',
            el('span', { class: 'muted', text: o.quoteAsset }),
        ]),
        kv('结算', [
            o.settleAmount ? fmt.money(o.settleAmount) : '—',
            ' ',
            el('span', { class: 'muted', text: o.settleAsset || '' }),
        ]),
        kv('通道', [o.paymentChannel || '—']),
        el('div', { class: 'kv' }, [
            el('div', { class: 'kv-key', text: '创建' }),
            el('div', { class: 'kv-val muted', text: fmt.time(o.createdAt) }),
        ]),
    ]));

    if (o.description) {
        card.appendChild(el('p', { class: 'order-desc', text: o.description }));
    }

    const actions = el('footer', { class: 'order-card-actions' });
    if (canMarkPaid) actions.appendChild(el('button', {
        class: 'btn btn--small', 'data-id': o.id, text: '标记已支付',
        onclick: () => orderAction('markPaid', o.id),
    }));
    if (canSettle) actions.appendChild(el('button', {
        class: 'btn btn--small btn--primary', 'data-id': o.id, text: '结算',
        onclick: () => orderAction('settle', o.id),
    }));
    if (canRefund) actions.appendChild(el('button', {
        class: 'btn btn--small', 'data-id': o.id, text: '退款',
        onclick: () => orderAction('refund', o.id),
    }));
    if (canCancel) actions.appendChild(el('button', {
        class: 'btn btn--small btn--ghost', 'data-id': o.id, text: '取消',
        onclick: () => orderAction('cancel', o.id),
    }));
    card.appendChild(actions);

    return card;
}

async function orderAction(kind, id) {
    try {
        if (kind === 'markPaid') {
            await Api.markOrderPaid(id);
            toast('订单已标记为已支付', 'ok');
        } else if (kind === 'settle') {
            await Api.settleOrder(id);
            toast('结算完成 — 已入分录', 'ok');
        } else if (kind === 'cancel') {
            const reason = prompt('取消原因（可选）') || '';
            await Api.cancelOrder(id, reason);
            toast('订单已取消', 'ok');
        } else if (kind === 'refund') {
            const amount = prompt('退款金额');
            if (!amount) return;
            await Api.refundOrder(id, amount, '');
            toast('退款完成 — 已入分录', 'ok');
        }
        await Promise.all([refreshOrders(), refreshBalances(), refreshLedger()]);
    } catch (err) {
        showError(err);
    }
}

// ----- Create-order modal --------------------------------------------------
$('#btn-create-order').addEventListener('click', () => {
    $('#modal-create-order').classList.remove('hidden');
    $('#create-order-form [name=merchantOrderNo]').value =
        `ORD-${new Date().toISOString().slice(0,10)}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
});
$$('[data-close]').forEach(elt => elt.addEventListener('click', () => {
    elt.closest('.modal').classList.add('hidden');
}));
$('#create-order-form').addEventListener('submit', async (ev) => {
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
        toast('订单已创建（PENDING_PAYMENT）', 'ok');
        await refreshOrders();
    } catch (err) {
        showError(err);
    }
});

// ---------------------------------------------------------------------------
// Vault — provision address + mock-bank credit
// ---------------------------------------------------------------------------
$('#provision-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try {
        const addr = await Api.provisionAddress({
            chainId: fd.get('chainId'),
            purpose: fd.get('purpose'),
            label:   fd.get('label') || null,
        });
        toast(`地址已申请 (${addr.chainId})`, 'ok');
        await refreshAddresses();
    } catch (err) {
        showError(err);
    }
});

async function refreshAddresses() {
    const wrap = $('#provisioned-addresses');
    const sel = $('#credit-form [name=toAddress]');
    clearChildren(wrap);
    clearChildren(sel);
    try {
        const list = await Api.listAddresses();
        if (!list.length) {
            wrap.appendChild(el('div', { class: 'addr-empty', text: '尚未申请任何地址。' }));
            sel.appendChild(el('option', { value: '', text: '— 先申请地址 —' }));
            return;
        }
        for (const a of list) {
            wrap.appendChild(el('div', { class: 'addr-row' }, [
                el('span', { class: 'chain-pill', text: a.chainId }),
                el('code', { class: 'addr-value', text: a.address }),
                el('span', { class: 'addr-purpose muted', text: a.purpose }),
                el('button', {
                    class: 'btn btn--ghost btn--tiny',
                    'data-copy': a.address,
                    text: '复制',
                    onclick: () => navigator.clipboard.writeText(a.address)
                        .then(() => toast('已复制', 'ok', 1200)),
                }),
            ]));
            sel.appendChild(el('option', {
                value: a.address,
                text: `${a.chainId} · ${fmt.short(a.address, 6, 6)}`,
            }));
        }
    } catch (err) {
        wrap.appendChild(el('div', { class: 'alert alert--error', text: err.message }));
    }
}

$('#credit-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const result = $('#vault-result');
    result.classList.add('hidden');
    clearChildren(result);
    try {
        await Api.mockBankCredit({
            chainId:   $('#provision-form [name=chainId]').value,
            asset:     fd.get('asset'),
            toAddress: fd.get('toAddress'),
            amount:    fd.get('amount'),
        });
        result.classList.remove('hidden');
        result.appendChild(el('strong', { text: '合成入金已注入。' }));
        result.appendChild(document.createTextNode(
            ' 扫块器在 ~10 秒内识别 → 写入 deposit (DETECTED) + 第 1/2 条分录；' +
            ' ~30 秒后达到 12 个确认 → 转 CREDITED + 第 3/4 条分录；' +
            ' 然后切到"分录流水"或"资金 · 余额"标签页观察变化。'
        ));
        toast('credit injected — 等待 scanner 处理', 'ok');
        pollLedgerUpdates(60_000);
    } catch (err) {
        showError(err);
    }
});

let pollTimer = null;
function pollLedgerUpdates(durationMs) {
    if (pollTimer) clearInterval(pollTimer);
    const stopAt = Date.now() + durationMs;
    pollTimer = setInterval(async () => {
        await Promise.allSettled([refreshLedger(), refreshBalances()]);
        if (Date.now() > stopAt) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }, 5_000);
}

// ---------------------------------------------------------------------------
// Ledger snapshot
// ---------------------------------------------------------------------------
async function refreshLedger() {
    const tbody = $('#ledger-tbody');
    clearChildren(tbody);
    try {
        const accounts = await Api.listAccounts();
        if (!accounts.length) {
            const tr = el('tr', {}, el('td', { colspan: '8', class: 'empty', text: '无账户。' }));
            tbody.appendChild(tr);
            return;
        }
        accounts.forEach((a, i) => {
            tbody.appendChild(el('tr', {}, [
                el('td', { class: 'mono', text: String(i + 1) }),
                el('td', {}, [
                    a.assetCode + ' · ',
                    el('span', { class: 'muted', text: a.accountType }),
                ]),
                el('td', { class: 'dir muted', text: '—' }),
                el('td', { class: 'num mono', text: fmt.money(a.balance) }),
                el('td', { class: 'num mono', text: fmt.money(a.balance) }),
                el('td', { class: 'muted', text: 'snapshot' }),
                el('td', { class: 'muted', text: 'current balance from latest entry' }),
                el('td', { class: 'muted', text: fmt.time(a.createdAt) }),
            ]));
        });
        const note = el('tr', { class: 'ledger-note' });
        note.appendChild(el('td', { colspan: '8' }, [
            el('strong', { text: '说明：' }),
            ' 当前面板显示各账户最新余额（每个账户最末一条 ledger_entry 的 balance_after）。',
            ' 完整的 per-tx 借贷流水在后端 V1 路线图中：',
            el('code', { text: 'GET /v1/ledger/transactions/{id}' }),
            ' 已就绪，全局 feed (',
            el('code', { text: 'GET /v1/accounts/{id}/entries' }),
            ') 是 P1 待办。',
            ' 要看完整 8 条分录可在 PG 查询：',
            el('code', { text: 'SELECT * FROM ledger_entry ORDER BY id;' }),
        ]));
        tbody.appendChild(note);
    } catch (err) {
        const tr = el('tr', {}, el('td', { colspan: '8', class: 'alert alert--error', text: err.message }));
        tbody.appendChild(tr);
    }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
if (Api.isLoggedIn()) {
    enterApp();
} else {
    showLogin();
}
