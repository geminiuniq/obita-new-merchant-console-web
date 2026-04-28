// =============================================================================
// app.js — Obita merchant portal demo
//
//   - Sidebar router renders one page at a time into #content-body.
//   - Wired pages call the real backend (Spring Boot on :8080).
//   - "Coming Soon" pages are static placeholders for unfinished modules.
//   - i18n: English by default, Chinese toggle (persisted in localStorage).
//   - All rendering uses createElement + textContent (no innerHTML on user data).
// =============================================================================

import { Api, ApiError } from './api.js';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
const I18N_KEY = 'obita.lang';
const SUPPORTED_LANGS = ['en', 'zh'];

const STRINGS = {
    en: {
        'login.eyebrow':   'Sign in · Backend Demo',
        'login.title':     'Merchant Console',
        'login.sub':       'Sign in to connect to the backend API. This page exercises the four core flows: Balances · Orders · Vault deposit · Ledger.',
        'login.merchant':  'Merchant code',
        'login.username':  'Username',
        'login.password':  'Password',
        'login.submit':    'Sign in →',
        'login.api':       'API',
        'login.brand.eyebrow':  'Vol.04 · Web2 + Web3 Treasury',
        'login.brand.headline.l1': 'Make',
        'login.brand.headline.l2': 'Payments',
        'login.brand.headline.em': 'Borderless.',
        'login.brand.sub': 'Multi-chain stablecoin custody, fiat on/off-ramp, double-entry ledger — built for the merchant treasury desk.',
        'login.brand.live':'Live · Local stack',
        'login.brand.seal':'TCSP · MSO · Regulated',

        'header.merchant': 'Merchant',
        'header.refresh':  'Refresh',
        'header.notif':    'Notifications',
        'header.lang':     'Language',
        'header.logout':   'Sign out',

        'nav.section.vaults':   'Asset Vaults',
        'nav.section.flow':     'Money Flow',
        'nav.section.ops':      'Operations',
        'nav.section.account':  'Account',
        'nav.overview':   'Overview',
        'nav.vault':      'Stablecoin Vault',
        'nav.fiat-vault': 'Fiat Vault',
        'nav.orders':     'Invoice Orders',
        'nav.payouts':    'Payouts',
        'nav.conversion': 'Conversion',
        'nav.ledger':     'Ledger',
        'nav.approvals':  'Approvals',
        'nav.reports':    'Report Center',
        'nav.members':    'Members',
        'nav.soon':       'Soon',
        'sidebar.backend':'Backend',

        'page.overview.eyebrow': 'OBITA · MERCHANT OVERVIEW',
        'page.overview.title':   'Treasury Overview',
        'page.overview.sub':     'A quick read on today\'s deposits, orders, and settlement. Every number comes straight from the backend ledger.',
        'overview.kpi.available':'Total Available',
        'overview.kpi.available.meta': 'Stablecoin total · sum of AVAILABLE across USDC + USDT.',
        'overview.kpi.pending':  'Pending In',
        'overview.kpi.pending.meta':  'On-chain deposits awaiting confirmations.',
        'overview.kpi.open':     'Open Orders',
        'overview.kpi.open.meta':     'Pending payment + paid + refunding combined.',
        'overview.kpi.settled':  'Settled (recent)',
        'overview.kpi.settled.meta':  'Of the most recent 10 orders.',
        'overview.balances.title':    'Balances · per asset',
        'overview.balances.action':   'Open Vault →',
        'overview.recent.title':      'Recent Invoice Orders',
        'overview.recent.action':     'All orders →',
        'overview.recent.empty.head': 'No orders yet',
        'overview.recent.empty.body': 'Click "+ New order" in the top right to create the first one.',

        'page.vault.eyebrow': 'TCSP · STABLECOIN VAULT',
        'page.vault.title':   'Stablecoin Vault',
        'page.vault.sub':     'Provision an on-chain receive address; the scanner picks up mock-bank credit within ~10s and lifts the balance from PENDING to AVAILABLE after 12 confirmations (~30s).',
        'vault.balances.title':  'Balances · at a glance',
        'vault.address.title':   'Address Book · receive addresses',
        'vault.address.empty':   'No addresses provisioned yet',
        'vault.address.empty.sub':'Use the form below to issue one.',
        'vault.provision.title': 'Provision Address',
        'vault.provision.chain':  'Chain',
        'vault.provision.purpose':'Purpose',
        'vault.provision.label':  'Label',
        'vault.provision.submit': 'Provision Address',
        'vault.mock.title':      'Test Deposit · simulate on-chain credit',
        'vault.mock.note.lead':  'Local-demo only.',
        'vault.mock.note':       ' Backend POST /mock-bank/credit pushes a synthetic credit to the chain adapter. The scanner detects it (~10s) → writes deposit + entries 1/2; ~30s later it reaches 12 confirmations → CREDITED + entries 3/4.',
        'vault.mock.to':         'To Address',
        'vault.mock.asset':      'Asset',
        'vault.mock.amount':     'Amount',
        'vault.mock.submit':     'Inject mock-bank credit',
        'vault.mock.toast':      'Credit injected · scanner working…',
        'vault.address.copy':    'Copy address',
        'vault.address.copied':  'Address copied to clipboard',

        'page.orders.eyebrow': 'MSO · INVOICE ORDER',
        'page.orders.title':   'Invoice Orders',
        'page.orders.sub':     'Lifecycle: CREATED → PENDING_PAYMENT → PAID → SETTLED → REFUNDING → REFUNDED. Every transition runs through an @Idempotent backend controller and posts ledger entries.',
        'orders.new':          '+ New order',
        'orders.kpi.all':      'All Orders',
        'orders.kpi.all.meta': 'Total count',
        'orders.kpi.open':     'Open',
        'orders.kpi.open.meta':'Pending payment / paid / refunding',
        'orders.kpi.settled':  'Settled',
        'orders.kpi.settled.meta':'Reached SETTLED',
        'orders.kpi.refunds':  'Refunds',
        'orders.kpi.refunds.meta':'Refunding / refunded',
        'orders.table.title':  'Orders',
        'orders.col.order':    'Order',
        'orders.col.quote':    'Quote',
        'orders.col.settle':   'Settle',
        'orders.col.channel':  'Channel',
        'orders.col.status':   'Status',
        'orders.col.time':     'Time',
        'orders.col.actions':  'Actions',
        'orders.empty.head':   'No orders yet',
        'orders.empty.body':   'Click "+ New order" to create the first one.',
        'orders.action.markPaid': 'Mark paid',
        'orders.action.settle':   'Settle',
        'orders.action.refund':   'Refund',
        'orders.action.cancel':   'Cancel',
        'orders.toast.markPaid':  'Order marked as paid',
        'orders.toast.settle':    'Settled · ledger entries posted',
        'orders.toast.cancel':    'Order cancelled',
        'orders.toast.refund':    'Refund completed · ledger entries posted',
        'orders.modal.title':     'New Invoice Order',
        'orders.modal.no':        'Merchant Order No',
        'orders.modal.quote':     'Quote',
        'orders.modal.amount':    'Amount',
        'orders.modal.settleAsset':'Settle currency',
        'orders.modal.channel':   'Payment channel',
        'orders.modal.desc':      'Description',
        'orders.modal.desc.placeholder':'optional',
        'orders.modal.cancel':    'Cancel',
        'orders.modal.create':    'Create order',
        'orders.modal.toast':     'Order created (PENDING_PAYMENT)',
        'orders.refund.prompt':   'Refund amount',
        'orders.cancel.prompt':   'Cancel reason (optional)',
        'orders.detail.title':    'Order Detail',
        'orders.detail.section.info':   'Order Information',
        'orders.detail.section.events': 'Event Timeline',
        'orders.detail.field.id':       'Order ID',
        'orders.detail.field.no':       'Merchant Order No',
        'orders.detail.field.status':   'Status',
        'orders.detail.field.quote':    'Quote',
        'orders.detail.field.settle':   'Settle',
        'orders.detail.field.channel':  'Channel',
        'orders.detail.field.expires':  'Expires',
        'orders.detail.field.created':  'Created',
        'orders.detail.field.updated':  'Updated',
        'orders.detail.field.desc':     'Description',
        'orders.detail.action.view':    'Details',

        'page.ledger.eyebrow': 'OBITA · LEDGER SNAPSHOT',
        'page.ledger.title':   'Ledger Snapshot',
        'page.ledger.sub':     'Latest balance_after for every account. The full per-tx feed (GET /v1/accounts/{id}/entries) is on the P1 backend roadmap.',
        'ledger.section':      'Account Balances',
        'ledger.col.no':       '#',
        'ledger.col.asset':    'Asset',
        'ledger.col.type':     'Account Type',
        'ledger.col.balance':  'Current Balance',
        'ledger.col.note':     'Note',
        'ledger.row.note':     'snapshot · balance_after',
        'ledger.note.lead':    'Tip:',
        'ledger.note.body':    ' the full happy-path 8 entries are visible directly in PG: ',
        'ledger.note.body2':   ' — one deposit + order settle + refund forms 4 paired debit/credit segments. The negative PLATFORM SETTLEMENT row represents on-chain assets held in custody (see 03-DOMAIN_MODEL.md §4).',

        'soon.label':           'Coming Soon',
        'soon.title.suffix':    '',
        'soon.fiat-vault.title':'Fiat Vault',
        'soon.fiat-vault.body': 'Fiat custody and B2B receivables. Backend schema is ready (payment_intent / ramp_transaction); service-side logic sits in the P1 Cashier module.',
        'soon.payouts.title':   'Payouts',
        'soon.payouts.body':    'Merchant withdrawals. The backend already enforces 4-eyes approval at the schema level; the console is on the P1 list.',
        'soon.conversion.title':'Conversion',
        'soon.conversion.body': 'On-chain swaps and bridge transfers. The BridgeProvider port is defined; real adapters are P0 → P1.',
        'soon.approvals.title': 'Approvals',
        'soon.approvals.body':  'Multi-party approvals and rules. Audit log + outbox tables exist; flows are queued for P1.',
        'soon.reports.title':   'Report Center',
        'soon.reports.body':    'Reconciliation and settlement reporting. Lights up once Cashier + Settlement are wired end-to-end.',
        'soon.members.title':   'Members',
        'soon.members.body':    'Members, roles and permissions. Only the demo user is enabled today; MFA/TOTP columns are reserved in schema.',
        'soon.page.eyebrow':    'OBITA · ',
        'soon.page.sub':        'This module is on the backend roadmap; the UI is not built yet. The note below summarises status.',

        'common.cancel':       'Cancel',
        'common.confirm':      'Confirm',
        'common.loading':      'Loading…',
        'common.error.head':   'Failed to load',
        'common.session.expired':'Session expired — please sign in again.',
    },
    zh: {
        'login.eyebrow':   '登录 · Backend Demo',
        'login.title':     '商户操作台',
        'login.sub':       '登录以连接后端 API。本页验证四个核心流程：账户余额 · 订单 · 入金扫块 · 资金分录。',
        'login.merchant':  '商户代码',
        'login.username':  '用户名',
        'login.password':  '密码',
        'login.submit':    '登录 →',
        'login.api':       'API',
        'login.brand.eyebrow':  'Vol.04 · Web2 + Web3 资金管理',
        'login.brand.headline.l1': '让',
        'login.brand.headline.l2': '支付',
        'login.brand.headline.em': '无国界。',
        'login.brand.sub': '多链稳定币托管 · 法币出入金 · 复式分录账本 — 为商户司库台而生。',
        'login.brand.live':'在线 · 本地环境',
        'login.brand.seal':'TCSP · MSO · 持牌运营',

        'header.merchant': '商户',
        'header.refresh':  '刷新',
        'header.notif':    '通知',
        'header.lang':     '语言',
        'header.logout':   '退出登录',

        'nav.section.vaults':   '资产保险柜',
        'nav.section.flow':     '资金流',
        'nav.section.ops':      '运营',
        'nav.section.account':  '账户',
        'nav.overview':   '总览',
        'nav.vault':      '稳定币保险柜',
        'nav.fiat-vault': '法币保险柜',
        'nav.orders':     '订单',
        'nav.payouts':    '出款',
        'nav.conversion': '兑换',
        'nav.ledger':     '账本',
        'nav.approvals':  '审批',
        'nav.reports':    '报表中心',
        'nav.members':    '成员',
        'nav.soon':       '待开发',
        'sidebar.backend':'后端',

        'page.overview.eyebrow': 'OBITA · 商户总览',
        'page.overview.title':   '商户操作台 · 总览',
        'page.overview.sub':     '当日入金 / 订单 / 结算的快速一览。所有数字直接来自后端账本。',
        'overview.kpi.available':'可用余额合计',
        'overview.kpi.available.meta': '稳定币合计 · USDC + USDT 等的 AVAILABLE 之和。',
        'overview.kpi.pending':  '入金待确认',
        'overview.kpi.pending.meta':  '链上等待确认的入金。',
        'overview.kpi.open':     '进行中订单',
        'overview.kpi.open.meta':     '待支付 + 已支付 + 退款中。',
        'overview.kpi.settled':  '已结算（近 10 单）',
        'overview.kpi.settled.meta':  '最近 10 笔中已结算的数量。',
        'overview.balances.title':    '余额 · 各资产',
        'overview.balances.action':   '进入保险柜 →',
        'overview.recent.title':      '最近订单',
        'overview.recent.action':     '全部订单 →',
        'overview.recent.empty.head': '还没有订单',
        'overview.recent.empty.body': '点击右上角「+ 新建订单」创建第一笔。',

        'page.vault.eyebrow': 'TCSP · 稳定币保险柜',
        'page.vault.title':   '稳定币保险柜',
        'page.vault.sub':     '申请一个链上入金地址。扫块器在 ~10 秒内识别 mock-bank 注入的 credit，并在 12 个确认（~30 秒）后把余额从 PENDING 移到 AVAILABLE。',
        'vault.balances.title':  '余额 · 一览',
        'vault.address.title':   '地址簿 · 入金地址',
        'vault.address.empty':   '尚未申请任何地址',
        'vault.address.empty.sub':'使用下方表单申请。',
        'vault.provision.title': '申请新地址',
        'vault.provision.chain':  '链',
        'vault.provision.purpose':'用途',
        'vault.provision.label':  '标签',
        'vault.provision.submit': '申请地址',
        'vault.mock.title':      '模拟入金 · 注入链上 credit',
        'vault.mock.note.lead':  '本卡仅用于本地演示。',
        'vault.mock.note':       ' 后端 POST /mock-bank/credit 将一笔合成 credit 推给链适配器；扫块器在 ~10 秒识别 → 写 deposit + 1/2 分录；~30 秒后到 12 confirmations → CREDITED + 3/4 分录。',
        'vault.mock.to':         '目标地址',
        'vault.mock.asset':      '资产',
        'vault.mock.amount':     '金额',
        'vault.mock.submit':     '注入 mock-bank credit',
        'vault.mock.toast':      '已注入 mock-bank credit · scanner 处理中…',
        'vault.address.copy':    '复制地址',
        'vault.address.copied':  '已复制到剪贴板',

        'page.orders.eyebrow': 'MSO · 商户订单',
        'page.orders.title':   '商户订单',
        'page.orders.sub':     '生命周期：CREATED → PENDING_PAYMENT → PAID → SETTLED → REFUNDING → REFUNDED。每个状态切换都通过 @Idempotent 后端控制器并入分录。',
        'orders.new':          '+ 新建订单',
        'orders.kpi.all':      '全部订单',
        'orders.kpi.all.meta': '总数',
        'orders.kpi.open':     '进行中',
        'orders.kpi.open.meta':'待支付 / 已支付 / 退款中',
        'orders.kpi.settled':  '已结算',
        'orders.kpi.settled.meta':'已到 SETTLED',
        'orders.kpi.refunds':  '退款',
        'orders.kpi.refunds.meta':'退款中 / 已退款',
        'orders.table.title':  '订单列表',
        'orders.col.order':    '订单',
        'orders.col.quote':    '报价',
        'orders.col.settle':   '结算',
        'orders.col.channel':  '通道',
        'orders.col.status':   '状态',
        'orders.col.time':     '时间',
        'orders.col.actions':  '操作',
        'orders.empty.head':   '还没有订单',
        'orders.empty.body':   '点击「+ 新建订单」创建第一笔。',
        'orders.action.markPaid': '标记已付',
        'orders.action.settle':   '结算',
        'orders.action.refund':   '退款',
        'orders.action.cancel':   '取消',
        'orders.toast.markPaid':  '订单已标记为已支付',
        'orders.toast.settle':    '结算完成 · 已入分录',
        'orders.toast.cancel':    '订单已取消',
        'orders.toast.refund':    '退款完成 · 已入分录',
        'orders.modal.title':     '新建订单',
        'orders.modal.no':        '商户订单号',
        'orders.modal.quote':     '报价币种',
        'orders.modal.amount':    '金额',
        'orders.modal.settleAsset':'结算币种',
        'orders.modal.channel':   '支付通道',
        'orders.modal.desc':      '描述',
        'orders.modal.desc.placeholder':'可选',
        'orders.modal.cancel':    '取消',
        'orders.modal.create':    '创建订单',
        'orders.modal.toast':     '订单已创建 (PENDING_PAYMENT)',
        'orders.refund.prompt':   '退款金额',
        'orders.cancel.prompt':   '取消原因（可选）',
        'orders.detail.title':    '订单详情',
        'orders.detail.section.info':   '订单信息',
        'orders.detail.section.events': '事件流水',
        'orders.detail.field.id':       '订单 ID',
        'orders.detail.field.no':       '商户订单号',
        'orders.detail.field.status':   '状态',
        'orders.detail.field.quote':    '报价',
        'orders.detail.field.settle':   '结算',
        'orders.detail.field.channel':  '通道',
        'orders.detail.field.expires':  '过期时间',
        'orders.detail.field.created':  '创建时间',
        'orders.detail.field.updated':  '更新时间',
        'orders.detail.field.desc':     '描述',
        'orders.detail.action.view':    '详情',

        'page.ledger.eyebrow': 'OBITA · 账本快照',
        'page.ledger.title':   '分录流水 · 余额快照',
        'page.ledger.sub':     '当前面板显示各账户最新 balance_after。完整的 per-tx 借贷流水接口（GET /v1/accounts/{id}/entries）在 P1 路线图。',
        'ledger.section':      '账户余额',
        'ledger.col.no':       '#',
        'ledger.col.asset':    '资产',
        'ledger.col.type':     '账户类型',
        'ledger.col.balance':  '当前余额',
        'ledger.col.note':     '说明',
        'ledger.row.note':     'snapshot · balance_after',
        'ledger.note.lead':    '提示：',
        'ledger.note.body':    ' 完整 happy-path 8 条分录可直接在 PG 查询：',
        'ledger.note.body2':   ' — 一笔 deposit + order settle + refund 形成借贷成对的 4 段；负的 PLATFORM SETTLEMENT 表示链上托管资产，详见 03-DOMAIN_MODEL.md §4。',

        'soon.label':           '即将上线',
        'soon.title.suffix':    '',
        'soon.fiat-vault.title':'法币保险柜',
        'soon.fiat-vault.body': '法币托管与对公收付。后端 schema 已就位（payment_intent / ramp_transaction），服务端逻辑在 P1 Cashier 模块。',
        'soon.payouts.title':   '出款',
        'soon.payouts.body':    '商户出款 / 提现 (Withdrawal) 流程。后端 schema 已带 4-eyes 审批，前端控制台为 P1 待办。',
        'soon.conversion.title':'兑换',
        'soon.conversion.body': '链上代币兑换与跨链桥接。BridgeProvider 端口已定义，真实接入位于 P0 → P1。',
        'soon.approvals.title': '审批',
        'soon.approvals.body':  '多人审批与规则。审计表 / outbox 已规划，UI 与流程在 P1 队列。',
        'soon.reports.title':   '报表中心',
        'soon.reports.body':    '对账与结算报告。等 Cashier + Settlement 联通后接入。',
        'soon.members.title':   '成员',
        'soon.members.body':    '成员、角色、权限。当前仅 demo 用户启用；MFA/TOTP 已留 schema 列。',
        'soon.page.eyebrow':    'OBITA · ',
        'soon.page.sub':        '该模块在后端路线图中已规划，UI 暂未实现。下方为占位说明。',

        'common.cancel':       '取消',
        'common.confirm':      '确认',
        'common.loading':      '加载中…',
        'common.error.head':   '加载失败',
        'common.session.expired':'登录已过期，请重新登录。',
    },
};

let currentLang = (() => {
    const saved = localStorage.getItem(I18N_KEY);
    if (SUPPORTED_LANGS.includes(saved)) return saved;
    return 'en';
})();

function t(key) {
    const dict = STRINGS[currentLang] || STRINGS.en;
    return dict[key] ?? STRINGS.en[key] ?? key;
}

function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem(I18N_KEY, lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applyStaticI18n();
    if (currentRoute) navigate(currentRoute, { force: true, skipPush: true });
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
}

function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class')        node.className = v;
        else if (k === 'text')    node.textContent = v;
        else if (k === 'value')   node.value = v;
        else if (k.startsWith('on') && typeof v === 'function')
            node.addEventListener(k.slice(2).toLowerCase(), v);
        else                      node.setAttribute(k, v);
    }
    for (const c of [].concat(children || [])) {
        if (c == null || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
}

const fmt = {
    money(v, decimals = 6) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Number(v);
        if (!isFinite(n)) return String(v);
        return n.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
        });
    },
    int(v) {
        if (v === null || v === undefined) return '0';
        return Number(v).toLocaleString();
    },
    short(s, head = 8, tail = 6) {
        if (!s) return '—';
        return s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
    },
    time(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US');
    },
};

function toast(msg, kind = 'info', ms = 3500) {
    const tNode = $('#toast');
    tNode.className = `toast toast--${kind}`;
    tNode.textContent = msg;
    tNode.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => tNode.classList.add('hidden'), ms);
}

function showError(err) {
    const msg = err instanceof ApiError
        ? `${err.code}: ${err.message}`
        : (err?.message || String(err));
    toast(msg, 'error', 5000);
}

// Map order status → pill variant + display label (untranslated; backend codes)
const STATUS_PILL = {
    CREATED:         'neutral',
    PENDING_PAYMENT: 'warn',
    PAID:            'info',
    SETTLED:         'success',
    REFUNDING:       'warn',
    REFUNDED:        'neutral',
    CANCELLED:       'neutral',
    EXPIRED:         'neutral',
};

function statusPill(status) {
    const variant = STATUS_PILL[status] || 'neutral';
    return el('span', { class: `pill pill--${variant}`, text: status });
}

// Editorial header card per page (legacy §3.1)
function pageHero({ eyebrow, title, sub, actions = [] }) {
    return el('div', { class: 'page-hero' }, [
        el('div', { class: 'page-hero-head' }, [
            el('div', {}, [
                el('div', { class: 'eyebrow-brass', text: eyebrow }),
                el('h1', { text: title }),
                sub ? el('p', { class: 'page-hero-sub', text: sub }) : null,
            ]),
            actions.length ? el('div', { class: 'page-hero-actions' }, actions) : null,
        ]),
    ]);
}

function sectionCard({ index, title, action }, body) {
    const head = el('header', { class: 'section-head' }, [
        index ? el('span', { class: 'idx-pill', text: index }) : null,
        el('h2', { text: title }),
        action ? el('div', { class: 'section-head-actions' }, action) : null,
    ]);
    const bodyNode = el('div', { class: 'section-body section-body--flush' });
    [].concat(body || []).forEach(b => {
        if (b == null || b === false) return;
        bodyNode.appendChild(typeof b === 'string' ? document.createTextNode(b) : b);
    });
    return el('section', { class: 'section-card' }, [head, bodyNode]);
}

function comingSoon(title, msg) {
    return el('div', { class: 'coming-soon' }, [
        el('span', { class: 'pill pill--neutral', text: t('soon.label') }),
        el('h3', { text: title }),
        el('p', { text: msg }),
    ]);
}

// ---------------------------------------------------------------------------
// Static (non-rendered) i18n: labels in HTML the router doesn't redraw.
// ---------------------------------------------------------------------------
function applyStaticI18n() {
    // Login
    const setText = (sel, key) => { const n = $(sel); if (n) n.textContent = t(key); };
    setText('#login-eyebrow', 'login.eyebrow');
    setText('#login-title',   'login.title');
    setText('#login-sub',     'login.sub');
    setText('#login-merchant-label', 'login.merchant');
    setText('#login-username-label', 'login.username');
    setText('#login-password-label', 'login.password');
    setText('#login-submit', 'login.submit');
    setText('#login-api-label', 'login.api');
    setText('#login-brand-eyebrow', 'login.brand.eyebrow');
    setText('#login-brand-l1', 'login.brand.headline.l1');
    setText('#login-brand-l2', 'login.brand.headline.l2');
    setText('#login-brand-em', 'login.brand.headline.em');
    setText('#login-brand-sub', 'login.brand.sub');
    setText('#login-brand-status', 'login.brand.live');
    setText('#login-brand-seal',   'login.brand.seal');

    // Header
    setText('#header-merchant-label', 'header.merchant');
    const refreshBtn = $('#btn-refresh'); if (refreshBtn) refreshBtn.title = t('header.refresh');
    const notifBtn   = $('#btn-notif');   if (notifBtn)   notifBtn.title   = t('header.notif');
    const langBtn    = $('#btn-lang');
    if (langBtn) {
        langBtn.title = t('header.lang');
        langBtn.textContent = currentLang === 'zh' ? '中' : 'EN';
    }
    const avatar     = $('#btn-logout');
    if (avatar) {
        const session = Api.loadSession() || {};
        const user = session.username || 'D';
        avatar.title = `${user} · ${t('header.logout')}`;
    }

    // Sidebar nav labels + section labels
    $$('#sidebar-nav .nav-item').forEach(a => {
        const labelKey = `nav.${a.dataset.route}`;
        const label = t(labelKey);
        const span = a.querySelector('.nav-label');
        if (span) span.textContent = label;
        const soon = a.querySelector('.nav-coming-soon');
        if (soon) soon.textContent = t('nav.soon');
    });
    $$('#sidebar-nav .nav-section-label').forEach(s => {
        const k = s.dataset.i18n;
        if (k) s.textContent = t(k);
    });

    // Sidebar foot
    const footLabel = $('#sidebar-foot-label');
    if (footLabel) footLabel.textContent = t('sidebar.backend');

    // Modal — order create
    setText('#m-order-title', 'orders.modal.title');
    setText('#m-order-no-label', 'orders.modal.no');
    setText('#m-order-quote-label', 'orders.modal.quote');
    setText('#m-order-quote-amount-label', 'orders.modal.amount');
    setText('#m-order-settle-label', 'orders.modal.settleAsset');
    setText('#m-order-settle-amount-label', 'orders.modal.amount');
    setText('#m-order-channel-label', 'orders.modal.channel');
    setText('#m-order-desc-label', 'orders.modal.desc');
    const descInput = $('#m-order-desc-input');
    if (descInput) descInput.placeholder = t('orders.modal.desc.placeholder');
    setText('#m-order-cancel', 'orders.modal.cancel');
    setText('#m-order-create', 'orders.modal.create');
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
$('#sidebar-foot-api').textContent = (() => {
    try { return new URL(Api.baseUrl()).host; } catch { return Api.baseUrl(); }
})();

document.addEventListener('auth:expired', () => {
    toast(t('common.session.expired'), 'error');
    showLogin();
});

$('#btn-logout').addEventListener('click', () => {
    Api.clearSession();
    showLogin();
});
$('#btn-refresh').addEventListener('click', () => {
    if (currentRoute) navigate(currentRoute, { force: true, skipPush: true });
});
$('#btn-lang').addEventListener('click', () => {
    setLang(currentLang === 'en' ? 'zh' : 'en');
});

// ---------------------------------------------------------------------------
// Theme (light / dark)
// ---------------------------------------------------------------------------
const THEME_KEY = 'obita.theme';
let currentTheme = (() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();

function applyTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = $('#btn-theme');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
}
applyTheme(currentTheme);

$('#btn-theme').addEventListener('click', () => {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
});

function showLogin() {
    document.body.classList.add('is-logged-out');
    $('#view-app').classList.add('hidden');
    $('#view-login').classList.remove('hidden');
}

function enterApp() {
    const session = Api.loadSession() || {};
    const code = session.merchantCode || '—';
    const user = session.username || '—';
    $('#header-merchant-name').textContent = code;
    $('#header-logo').textContent = (code[0] || '·').toUpperCase();
    const avatarBtn = $('#btn-logout');
    avatarBtn.textContent = (user[0] || 'D').toUpperCase();

    document.body.classList.remove('is-logged-out');
    $('#view-login').classList.add('hidden');
    $('#view-app').classList.remove('hidden');
    applyStaticI18n();

    const initial = (location.hash || '').replace(/^#/, '') || 'overview';
    navigate(initial, { replace: true });
}

// Live clock for login panel
function tickLoginTime() {
    const node = $('#login-brand-time');
    if (!node) return;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    node.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} HKT`;
}
tickLoginTime();
setInterval(tickLoginTime, 1000);

// Modal close handlers
$$('[data-close]').forEach(elt => elt.addEventListener('click', () => {
    elt.closest('.modal').classList.add('hidden');
}));

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const ROUTES = {
    'overview':   renderOverview,
    'vault':      renderVault,
    'orders':     renderOrders,
    'ledger':     renderLedger,
    'fiat-vault': () => renderComingSoon('fiat-vault'),
    'payouts':    () => renderComingSoon('payouts'),
    'conversion': () => renderComingSoon('conversion'),
    'approvals':  () => renderComingSoon('approvals'),
    'reports':    () => renderComingSoon('reports'),
    'members':    () => renderComingSoon('members'),
};

let currentRoute = null;

async function navigate(route, { replace = false, force = false, skipPush = false } = {}) {
    if (!ROUTES[route]) route = 'overview';
    if (currentRoute === route && !force) return;

    currentRoute = route;
    if (!skipPush) {
        if (replace) history.replaceState(null, '', `#${route}`);
        else         history.pushState(null, '', `#${route}`);
    }

    $$('.nav-item').forEach(a => {
        a.classList.toggle('active', a.dataset.route === route);
    });

    const body = $('#content-body');
    clear(body);
    body.appendChild(el('div', { class: 'empty', text: t('common.loading') }));
    try {
        await ROUTES[route](body);
    } catch (err) {
        clear(body);
        body.appendChild(pageHero({
            eyebrow: 'OBITA · ERROR',
            title: t('common.error.head'),
            sub: err.message || String(err),
        }));
    }
}

window.addEventListener('hashchange', () => {
    const route = (location.hash || '').replace(/^#/, '') || 'overview';
    navigate(route, { replace: true, skipPush: true });
});

document.getElementById('sidebar-nav').addEventListener('click', (ev) => {
    const a = ev.target.closest('.nav-item');
    if (!a) return;
    ev.preventDefault();
    navigate(a.dataset.route);
});

// ---------------------------------------------------------------------------
// PAGE: OVERVIEW
// ---------------------------------------------------------------------------
async function renderOverview(root) {
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
    const ordersPage = ordersRes.status === 'fulfilled' ? ordersRes.value : { data: [] };
    const orders = ordersPage.data || [];

    const stableAssets = ['USDC-POLYGON', 'USDC-ETH', 'USDT-BSC', 'USDT-TRC20'];
    const sumByType = (type) => accounts
        .filter(a => stableAssets.includes(a.assetCode) && a.accountType === type)
        .reduce((s, a) => s + Number(a.balance || 0), 0);

    const availableTotal = sumByType('AVAILABLE');
    const pendingTotal   = sumByType('PENDING');
    const ordersOpen = orders.filter(o => ['CREATED','PENDING_PAYMENT','PAID','REFUNDING'].includes(o.status)).length;
    const ordersSettled = orders.filter(o => o.status === 'SETTLED').length;

    root.appendChild(el('div', { class: 'kpi-strip' }, [
        el('div', { class: 'kpi-tile kpi-tile--hero' }, [
            el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--brass' }), t('overview.kpi.available')]),
            el('div', { class: 'kpi-value', text: fmt.money(availableTotal, 2) }),
            el('div', { class: 'kpi-meta', text: t('overview.kpi.available.meta') }),
        ]),
        el('div', { class: 'kpi-tile' }, [
            el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--warn' }), t('overview.kpi.pending')]),
            el('div', { class: 'kpi-value', text: fmt.money(pendingTotal, 2) }),
            el('div', { class: 'kpi-meta', text: t('overview.kpi.pending.meta') }),
        ]),
        el('div', { class: 'kpi-tile' }, [
            el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--info' }), t('overview.kpi.open')]),
            el('div', { class: 'kpi-value', text: fmt.int(ordersOpen) }),
            el('div', { class: 'kpi-meta', text: t('overview.kpi.open.meta') }),
        ]),
        el('div', { class: 'kpi-tile' }, [
            el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--success' }), t('overview.kpi.settled')]),
            el('div', { class: 'kpi-value', text: fmt.int(ordersSettled) }),
            el('div', { class: 'kpi-meta', text: t('overview.kpi.settled.meta') }),
        ]),
    ]));

    const cols = el('div', { style: 'display:grid; grid-template-columns: 1.2fr 1fr; gap: 24px; align-items: start;' });

    // Balances summary
    const balancesBody = el('div', { style: 'padding: 18px 24px 24px;' });
    if (accounts.length === 0) {
        balancesBody.appendChild(el('div', { class: 'empty', text: '—' }));
    } else {
        const byAsset = {};
        for (const a of accounts) (byAsset[a.assetCode] ||= []).push(a);
        const grid = el('div', { class: 'balances-grid' });
        for (const [asset, list] of Object.entries(byAsset)) {
            const available = list.find(x => x.accountType === 'AVAILABLE');
            const pending   = list.find(x => x.accountType === 'PENDING');
            const settle    = list.find(x => x.accountType === 'SETTLEMENT');
            grid.appendChild(el('div', { class: 'balance-card' }, [
                el('div', { class: 'balance-card-head' }, [el('span', { class: 'asset-chip', text: asset })]),
                el('div', { class: 'balance-card-amount', text: available ? fmt.money(available.balance) : '—' }),
                el('div', { class: 'balance-card-label', text: 'AVAILABLE' }),
                el('ul', { class: 'balance-breakdown' }, [
                    el('li', {}, [el('span', { class: 'bd-key', text: 'Pending' }),    el('span', { class: 'bd-val', text: fmt.money(pending?.balance || 0) })]),
                    el('li', {}, [el('span', { class: 'bd-key', text: 'Settlement' }), el('span', { class: 'bd-val', text: fmt.money(settle?.balance || 0) })]),
                ]),
            ]));
        }
        balancesBody.appendChild(grid);
    }
    cols.appendChild(sectionCard({
        index: '01',
        title: t('overview.balances.title'),
        action: el('a', { href: '#vault', class: 'btn btn--small btn--ghost', text: t('overview.balances.action') }),
    }, balancesBody));

    // Recent orders
    const recentBody = el('div', { class: 'data-table-wrap' });
    if (orders.length === 0) {
        recentBody.appendChild(el('div', { class: 'empty' }, [
            el('strong', { text: t('overview.recent.empty.head') }),
            t('overview.recent.empty.body'),
        ]));
    } else {
        recentBody.appendChild(el('table', { class: 'data-table' }, [
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
                el('td', { class: 'num' }, [
                    fmt.money(o.quoteAmount, 2), ' ',
                    el('span', { class: 'muted', text: o.quoteAsset }),
                ]),
                el('td', {}, statusPill(o.status)),
                el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: fmt.time(o.createdAt) }),
            ]))),
        ]));
    }
    cols.appendChild(sectionCard({
        index: '02',
        title: t('overview.recent.title'),
        action: el('a', { href: '#orders', class: 'btn btn--small btn--ghost', text: t('overview.recent.action') }),
    }, recentBody));

    root.appendChild(cols);
}

// ---------------------------------------------------------------------------
// PAGE: STABLECOIN VAULT
// ---------------------------------------------------------------------------
async function renderVault(root) {
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

    // 01 — balances per asset
    const stableAssets = ['USDC-POLYGON', 'USDC-ETH', 'USDT-BSC', 'USDT-TRC20'];
    const balancesGrid = el('div', { class: 'balances-grid', style: 'padding: 24px;' });
    for (const asset of stableAssets) {
        const list = accounts.filter(a => a.assetCode === asset);
        const available = list.find(x => x.accountType === 'AVAILABLE');
        const pending   = list.find(x => x.accountType === 'PENDING');
        const settle    = list.find(x => x.accountType === 'SETTLEMENT');
        balancesGrid.appendChild(el('div', { class: 'balance-card' }, [
            el('div', { class: 'balance-card-head' }, [el('span', { class: 'asset-chip', text: asset })]),
            el('div', { class: 'balance-card-amount', text: fmt.money(available?.balance || 0) }),
            el('div', { class: 'balance-card-label', text: 'AVAILABLE' }),
            el('ul', { class: 'balance-breakdown' }, [
                el('li', {}, [el('span', { class: 'bd-key', text: 'Pending' }),    el('span', { class: 'bd-val', text: fmt.money(pending?.balance || 0) })]),
                el('li', {}, [el('span', { class: 'bd-key', text: 'Settlement' }), el('span', { class: 'bd-val', text: fmt.money(settle?.balance || 0) })]),
            ]),
        ]));
    }
    root.appendChild(sectionCard({ index: '01', title: t('vault.balances.title') }, balancesGrid));

    // 02 — Address Book + Provision form
    const addrWrap = el('div', { style: 'padding: 20px 24px 24px;' });
    const addrCards = el('div', { class: 'addr-cards' });
    if (addresses.length === 0) {
        addrCards.appendChild(el('div', { class: 'addr-empty-tile' }, [
            el('div', { style: 'font-size:24px;color:var(--ink-quiet);', text: '◇' }),
            el('div', { style: 'font-weight:600;color:var(--ink-base);', text: t('vault.address.empty') }),
            el('div', { class: 'muted', style: 'font-size:12px;', text: t('vault.address.empty.sub') }),
        ]));
    } else {
        for (const a of addresses) addrCards.appendChild(renderAddrCard(a));
    }
    addrWrap.appendChild(addrCards);

    const provisionForm = el('form', { class: 'form', style: 'padding: 20px 24px; border-top: 1px solid var(--line-soft); margin-top: 20px;' }, [
        el('div', { class: 'eyebrow-brass', style: 'margin-bottom:8px;', text: t('vault.provision.title') }),
        el('div', { class: 'form-row' }, [
            el('label', { class: 'field' }, [
                el('span', { class: 'field-label', text: t('vault.provision.chain') }),
                el('select', { name: 'chainId' }, [
                    el('option', { value: 'POLYGON', text: 'POLYGON' }),
                    el('option', { value: 'ETH',     text: 'ETH' }),
                    el('option', { value: 'BSC',     text: 'BSC' }),
                    el('option', { value: 'TRON',    text: 'TRON' }),
                ]),
            ]),
            el('label', { class: 'field' }, [
                el('span', { class: 'field-label', text: t('vault.provision.purpose') }),
                el('select', { name: 'purpose' }, [
                    el('option', { value: 'DEPOSIT',    text: 'DEPOSIT' }),
                    el('option', { value: 'SETTLEMENT', text: 'SETTLEMENT' }),
                    el('option', { value: 'HOT',        text: 'HOT' }),
                ]),
            ]),
        ]),
        el('div', { class: 'form-row' }, [
            el('label', { class: 'field' }, [
                el('span', { class: 'field-label', text: t('vault.provision.label') }),
                el('input', { type: 'text', name: 'label', value: 'Main', maxlength: '64' }),
            ]),
            el('div', { style: 'display:flex; align-items:flex-end;' }, [
                el('button', { type: 'submit', class: 'btn btn--primary', style: 'width: 100%;', text: t('vault.provision.submit') }),
            ]),
        ]),
    ]);
    provisionForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        try {
            const addr = await Api.provisionAddress({
                chainId: fd.get('chainId'),
                purpose: fd.get('purpose'),
                label:   fd.get('label') || null,
            });
            toast(`Address provisioned (${addr.chainId})`, 'ok');
            navigate('vault', { force: true, skipPush: true });
        } catch (err) {
            showError(err);
        }
    });
    addrWrap.appendChild(provisionForm);
    root.appendChild(sectionCard({ index: '02', title: t('vault.address.title') }, addrWrap));

    // 03 — Mock bank credit
    const mockBody = el('div', { style: 'padding: 24px;' }, [
        el('div', { class: 'alert alert--info', style: 'margin-bottom: 18px;' }, [
            el('strong', { text: t('vault.mock.note.lead') }),
            t('vault.mock.note'),
        ]),
        renderMockBankForm(addresses),
    ]);
    root.appendChild(sectionCard({ index: '03', title: t('vault.mock.title') }, mockBody));
}

function renderAddrCard(a) {
    const chain = a.chainId || 'OTHER';
    return el('div', { class: 'addr-card' }, [
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
                onclick: () => navigator.clipboard.writeText(a.address)
                    .then(() => toast(t('vault.address.copied'), 'ok', 1200)),
            }),
            el('span', { class: 'muted', style: 'font-size:11px; margin-left:auto; font-family:var(--font-mono);', text: fmt.short(a.address, 6, 6) }),
        ]),
    ]);
}

function renderMockBankForm(addresses) {
    const select = el('select', { name: 'toAddress', required: 'required' });
    if (addresses.length === 0) {
        select.appendChild(el('option', { value: '', text: '— ' + t('vault.address.empty') + ' —' }));
    } else {
        for (const a of addresses) {
            select.appendChild(el('option', {
                value: a.address,
                text: `${a.chainId} · ${fmt.short(a.address, 6, 6)} · ${a.purpose}`,
            }));
        }
    }
    const form = el('form', { class: 'form' }, [
        el('div', { class: 'form-row' }, [
            el('label', { class: 'field' }, [
                el('span', { class: 'field-label', text: t('vault.mock.to') }),
                select,
            ]),
            el('label', { class: 'field' }, [
                el('span', { class: 'field-label', text: t('vault.mock.asset') }),
                el('select', { name: 'asset', required: 'required' }, [
                    el('option', { value: 'USDC-POLYGON', text: 'USDC-POLYGON' }),
                    el('option', { value: 'USDC-ETH',     text: 'USDC-ETH' }),
                    el('option', { value: 'USDT-BSC',     text: 'USDT-BSC' }),
                    el('option', { value: 'USDT-TRC20',   text: 'USDT-TRC20' }),
                ]),
            ]),
        ]),
        el('div', { class: 'form-row' }, [
            el('label', { class: 'field' }, [
                el('span', { class: 'field-label', text: t('vault.mock.amount') }),
                el('input', { type: 'number', name: 'amount', min: '0', step: '0.000001', value: '500', required: 'required' }),
            ]),
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
                chainId,
                asset:     fd.get('asset'),
                toAddress,
                amount:    fd.get('amount'),
            });
            toast(t('vault.mock.toast'), 'ok', 5000);
            pollOverviewUpdates(60_000);
        } catch (err) {
            showError(err);
        }
    });
    return form;
}

let pollTimer = null;
function pollOverviewUpdates(durationMs) {
    if (pollTimer) clearInterval(pollTimer);
    const stopAt = Date.now() + durationMs;
    pollTimer = setInterval(async () => {
        if (currentRoute === 'vault' || currentRoute === 'overview' || currentRoute === 'ledger') {
            navigate(currentRoute, { force: true, skipPush: true });
        }
        if (Date.now() > stopAt) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }, 6_000);
}

// ---------------------------------------------------------------------------
// PAGE: ORDERS
// ---------------------------------------------------------------------------
async function renderOrders(root) {
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

    const counts = {
        all:      orders.length,
        open:     orders.filter(o => ['CREATED','PENDING_PAYMENT','PAID'].includes(o.status)).length,
        settled:  orders.filter(o => o.status === 'SETTLED').length,
        refunded: orders.filter(o => ['REFUNDING','REFUNDED'].includes(o.status)).length,
    };
    root.appendChild(el('div', { class: 'kpi-strip' }, [
        el('div', { class: 'kpi-tile kpi-tile--hero' }, [
            el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--brass' }), t('orders.kpi.all')]),
            el('div', { class: 'kpi-value', text: fmt.int(counts.all) }),
            el('div', { class: 'kpi-meta', text: t('orders.kpi.all.meta') }),
        ]),
        el('div', { class: 'kpi-tile' }, [
            el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--warn' }), t('orders.kpi.open')]),
            el('div', { class: 'kpi-value', text: fmt.int(counts.open) }),
            el('div', { class: 'kpi-meta', text: t('orders.kpi.open.meta') }),
        ]),
        el('div', { class: 'kpi-tile' }, [
            el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--success' }), t('orders.kpi.settled')]),
            el('div', { class: 'kpi-value', text: fmt.int(counts.settled) }),
            el('div', { class: 'kpi-meta', text: t('orders.kpi.settled.meta') }),
        ]),
        el('div', { class: 'kpi-tile' }, [
            el('div', { class: 'kpi-label' }, [el('span', { class: 'kpi-dot kpi-dot--info' }), t('orders.kpi.refunds')]),
            el('div', { class: 'kpi-value', text: fmt.int(counts.refunded) }),
            el('div', { class: 'kpi-meta', text: t('orders.kpi.refunds.meta') }),
        ]),
    ]));

    const wrap = el('div', { class: 'data-table-wrap' });
    if (orders.length === 0) {
        wrap.appendChild(el('div', { class: 'empty' }, [
            el('strong', { text: t('orders.empty.head') }),
            t('orders.empty.body'),
        ]));
    } else {
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
            el('tbody', {}, orders.map(o => el('tr', {
                style: 'cursor:pointer;',
                onclick: () => openOrderDetail(o.id),
            }, [
                el('td', {}, [
                    el('div', { class: 'cell-no', text: o.merchantOrderNo }),
                    el('div', { class: 'cell-id mono', text: fmt.short(o.id) }),
                ]),
                el('td', { class: 'num' }, [
                    fmt.money(o.quoteAmount, 2), ' ',
                    el('span', { class: 'muted', text: o.quoteAsset }),
                ]),
                el('td', { class: 'num' }, [
                    o.settleAmount ? fmt.money(o.settleAmount) : '—', ' ',
                    el('span', { class: 'muted', text: o.settleAsset || '' }),
                ]),
                el('td', {}, el('span', { class: 'pill pill--neutral', text: o.paymentChannel || 'CRYPTO' })),
                el('td', {}, statusPill(o.status)),
                el('td', { class: 'mono', style: 'font-size:12px;color:var(--ink-mute);', text: fmt.time(o.createdAt) }),
                el('td', { class: 'cell-actions' }, orderActionButtons(o)),
            ]))),
        ]));
    }
    root.appendChild(sectionCard({ index: '01', title: t('orders.table.title') }, wrap));
}

function orderActionButtons(o) {
    const btns = [];
    btns.push(el('button', {
        class: 'btn btn--tiny btn--ghost',
        text: t('orders.detail.action.view'),
        onclick: (ev) => { ev.stopPropagation(); openOrderDetail(o.id); },
    }));
    if (o.status === 'PENDING_PAYMENT') {
        btns.push(el('button', { class: 'btn btn--tiny', text: t('orders.action.markPaid'), onclick: (ev) => { ev.stopPropagation(); orderAction('markPaid', o.id); } }));
    }
    if (o.status === 'PAID') {
        btns.push(el('button', { class: 'btn btn--tiny btn--primary', text: t('orders.action.settle'), onclick: (ev) => { ev.stopPropagation(); orderAction('settle', o.id); } }));
    }
    if (['SETTLED','REFUNDING'].includes(o.status)) {
        btns.push(el('button', { class: 'btn btn--tiny', text: t('orders.action.refund'), onclick: (ev) => { ev.stopPropagation(); orderAction('refund', o.id); } }));
    }
    if (['CREATED','PENDING_PAYMENT','PAID'].includes(o.status)) {
        btns.push(el('button', { class: 'btn btn--tiny btn--ghost', text: t('orders.action.cancel'), onclick: (ev) => { ev.stopPropagation(); orderAction('cancel', o.id); } }));
    }
    return btns;
}

async function openOrderDetail(id) {
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

    // Info card
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
        o.description ? kv(t('orders.detail.field.desc'),    o.description) : null,
    ]));

    // Events timeline
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
            el('span', {
                style: 'width:8px; height:8px; border-radius:999px; background: var(--clr-brand-brass); margin-top:7px;',
            }),
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
        navigate(currentRoute, { force: true, skipPush: true });
    } catch (err) {
        showError(err);
    }
}

function openCreateOrderModal() {
    const modal = $('#modal-create-order');
    modal.classList.remove('hidden');
    $('#create-order-form [name=merchantOrderNo]').value =
        `ORD-${new Date().toISOString().slice(0,10)}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

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
        toast(t('orders.modal.toast'), 'ok');
        if (currentRoute === 'orders' || currentRoute === 'overview') {
            navigate(currentRoute, { force: true, skipPush: true });
        } else {
            navigate('orders');
        }
    } catch (err) {
        showError(err);
    }
});

// ---------------------------------------------------------------------------
// PAGE: LEDGER
// ---------------------------------------------------------------------------
async function renderLedger(root) {
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
                          : a.accountType === 'PENDING' ? 'warn'
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

// ---------------------------------------------------------------------------
// PAGE: COMING SOON
// ---------------------------------------------------------------------------
function renderComingSoon(routeKey) {
    const root = $('#content-body');
    clear(root);
    const title = t(`soon.${routeKey}.title`);
    const body  = t(`soon.${routeKey}.body`);
    root.appendChild(pageHero({
        eyebrow: t('soon.page.eyebrow') + title.toUpperCase(),
        title,
        sub: t('soon.page.sub'),
    }));
    root.appendChild(comingSoon(title, body));
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
applyStaticI18n();
if (Api.isLoggedIn()) {
    enterApp();
} else {
    showLogin();
}
