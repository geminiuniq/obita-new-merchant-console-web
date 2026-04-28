// =============================================================================
// dom.js — tiny createElement helper + selectors. No innerHTML on user data.
// =============================================================================

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
}

export function el(tag, attrs = {}, children = []) {
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
