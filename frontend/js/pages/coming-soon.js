// =============================================================================
// pages/coming-soon.js — placeholder page for unfinished modules.
// =============================================================================

import { $, clear } from '../dom.js';
import { t } from '../i18n.js';
import { pageHero, comingSoon } from '../ui.js';

export function renderComingSoon(routeKey) {
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
