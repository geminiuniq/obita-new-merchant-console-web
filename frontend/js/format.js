// =============================================================================
// format.js — number / time / address formatters. Locale-aware.
// =============================================================================

import { getLang } from './i18n.js';

export const fmt = {
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
        return d.toLocaleString(getLang() === 'zh' ? 'zh-CN' : 'en-US');
    },
};
