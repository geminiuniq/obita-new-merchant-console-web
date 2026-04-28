// =============================================================================
// theme.js — light / dark theme toggle. Persists in localStorage.
// =============================================================================

import { $ } from './dom.js';

const THEME_KEY = 'obita.theme';

let currentTheme = (() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();

export function getTheme() { return currentTheme; }

export function applyTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = $('#btn-theme');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
}

export function toggleTheme() {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}
