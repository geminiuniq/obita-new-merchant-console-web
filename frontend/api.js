// =============================================================================
// api.js — thin fetch wrapper around the Obita backend
//
//   - JWT stored in localStorage; injected as Authorization header
//   - Idempotency-Key header generated for every state-changing request
//   - Errors surface as ApiError with the backend's stable code + details
//   - 401 clears the token and dispatches "auth:expired" so the app can
//     return to the login screen
// =============================================================================

const STORAGE_KEY = 'obita.session';
const DEFAULT_BASE = 'http://localhost:8080';

export class ApiError extends Error {
    constructor({ status, code, message, details, requestId }) {
        super(message || code || `HTTP ${status}`);
        this.status = status;
        this.code = code;
        this.details = details;
        this.requestId = requestId;
    }
}

export const Api = {
    baseUrl() {
        return localStorage.getItem(`${STORAGE_KEY}.baseUrl`) || DEFAULT_BASE;
    },

    // ----- session ------------------------------------------------------
    saveSession({ accessToken, username, merchantId, roles, merchantCode }) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            accessToken, username, merchantId, roles, merchantCode,
        }));
    },
    loadSession() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
        catch { return null; }
    },
    clearSession() { localStorage.removeItem(STORAGE_KEY); },
    isLoggedIn()   { const s = this.loadSession(); return !!(s && s.accessToken); },

    // ----- low-level fetch ---------------------------------------------
    async _fetch(method, path, { body, idempotency, query } = {}) {
        const session = this.loadSession();
        const url = new URL(this.baseUrl() + path);
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
            }
        }

        const headers = { 'Accept': 'application/json' };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        if (session?.accessToken) headers['Authorization'] = `Bearer ${session.accessToken}`;
        if (idempotency || (method !== 'GET' && method !== 'HEAD')) {
            headers['Idempotency-Key'] = idempotency || `ui-${crypto.randomUUID()}`;
        }

        const res = await fetch(url.toString(), {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        // 204 / 202 / empty bodies
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
            if (res.status === 401) {
                this.clearSession();
                document.dispatchEvent(new CustomEvent('auth:expired'));
            }
            throw new ApiError({
                status: res.status,
                code: data?.code || `HTTP_${res.status}`,
                message: data?.message || res.statusText,
                details: data?.details,
                requestId: data?.requestId,
            });
        }
        return data;
    },

    // ----- auth ---------------------------------------------------------
    async login({ merchantCode, username, password }) {
        const data = await this._fetch('POST', '/v1/auth/login', {
            body: { merchantCode, username, password },
        });
        this.saveSession({ ...data, merchantCode });
        return data;
    },
    me() { return this._fetch('GET', '/v1/auth/me'); },

    // ----- accounts -----------------------------------------------------
    listAccounts() { return this._fetch('GET', '/v1/accounts'); },

    // ----- orders -------------------------------------------------------
    listOrders(filters = {}) {
        return this._fetch('GET', '/v1/orders', { query: filters });
    },
    getOrder(id)              { return this._fetch('GET', `/v1/orders/${id}`); },
    getOrderEvents(id)        { return this._fetch('GET', `/v1/orders/${id}/events`); },
    createOrder(payload)      { return this._fetch('POST', '/v1/orders', { body: payload }); },
    markOrderPaid(id)         { return this._fetch('POST', `/v1/orders/${id}/mark-paid`); },
    settleOrder(id)           { return this._fetch('POST', `/v1/orders/${id}/settle`); },
    cancelOrder(id, reason)   { return this._fetch('POST', `/v1/orders/${id}/cancel`, { body: { reason } }); },
    refundOrder(id, amount, reason) {
        return this._fetch('POST', `/v1/orders/${id}/refunds`, {
            body: { amount: String(amount), reason: reason || '' },
        });
    },

    // ----- vault --------------------------------------------------------
    listAddresses()           { return this._fetch('GET', '/v1/wallet-addresses'); },
    provisionAddress(payload) { return this._fetch('POST', '/v1/wallet-addresses', { body: payload }); },

    // ----- withdrawals (payouts) ---------------------------------------
    listWithdrawals(filters = {}) {
        return this._fetch('GET', '/v1/withdrawals', { query: filters });
    },
    getWithdrawal(id)        { return this._fetch('GET', `/v1/withdrawals/${id}`); },
    createWithdrawal(payload) { return this._fetch('POST', '/v1/withdrawals', { body: payload }); },
    approveWithdrawal(id)    { return this._fetch('POST', `/v1/withdrawals/${id}/approve`); },
    rejectWithdrawal(id, reason) {
        return this._fetch('POST', `/v1/withdrawals/${id}/reject`, { body: { reason: reason || '' } });
    },

    // mock-bank is unauthenticated — clear Authorization header explicitly
    async mockBankCredit({ chainId, asset, toAddress, amount }) {
        const res = await fetch(this.baseUrl() + '/mock-bank/credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ chainId, asset, toAddress, amount: String(amount) }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new ApiError({
                status: res.status,
                code: data.code || `HTTP_${res.status}`,
                message: data.message || res.statusText,
            });
        }
        return res.json();
    },
};

// Convenience for one-off API base override (?api=http://...)
const apiOverride = new URLSearchParams(location.search).get('api');
if (apiOverride) localStorage.setItem(`${STORAGE_KEY}.baseUrl`, apiOverride);
