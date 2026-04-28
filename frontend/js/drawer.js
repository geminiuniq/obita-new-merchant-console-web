// =============================================================================
// drawer.js — generic right-side drawer + overlay control.
// =============================================================================

import { $, $$ } from './dom.js';

const OVERLAY = '#drawer-overlay';

export function openDrawer(selector) {
    closeAllDrawers();
    const drawer = $(selector);
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    $(OVERLAY).classList.add('is-open');
}

export function closeAllDrawers() {
    $$('.drawer').forEach(d => {
        d.classList.remove('is-open');
        d.setAttribute('aria-hidden', 'true');
    });
    $(OVERLAY).classList.remove('is-open');
}

export function bindDrawerControls() {
    $(OVERLAY).addEventListener('click', closeAllDrawers);
    $$('[data-drawer-close]').forEach(btn => btn.addEventListener('click', closeAllDrawers));
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeAllDrawers();
    });
}
