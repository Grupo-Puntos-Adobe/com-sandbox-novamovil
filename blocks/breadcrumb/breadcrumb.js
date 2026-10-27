/*
 * Breadcrumb block: the path to the current page ("Inicio › Celulares").
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Breadcrumb" table. It only appears on the pages that add the table in Drive.
 *
 * Authoring: one row per level, every row optional and in any order:
 *   | Styles / Classname / Session | …    (scripts/foundations/block-options.js)
 *   | Level 1            | [Inicio](/)    |   (a link: a level above the current page)
 *   | Level 2            | Celulares      |   (plain text: the current page)
 *   | Level 3            | {breadcrumb-name} |   (optional: filled at run time, see below)
 * Levels are shown by their number; an empty level is left out. A level can end with a session
 * state in a 3rd cell (| Level 2 | Mi cuenta | signed-in |): block-options.js keeps only the
 * levels of the current state before this block reads them.
 * Dynamic levels: a mark of PAGE_CONTEXT (scripts/foundations/page-context.js) between braces is
 * replaced by the value another block sets with setPageContext() — today {breadcrumb-name},
 * set by product-detail with the product name. A level can mix text and marks
 * ("Detalle de {breadcrumb-name}") and several levels can be dynamic, each with its own mark;
 * a level waits for its values (not painted until they arrive). Without marks the level is
 * shown as authored.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)       scripts/foundations/block-options.js
 *     ├─ readBreadcrumbLevels(block)    "Level N" rows sorted by N → [{ text, href }]
 *     └─ renderBreadcrumbTrail(block, levels)   fillPageContext(); again on PAGE_CONTEXT_EVENT
 *          └─ buildBreadcrumbItem() per level (the last one is the current page)
 *
 * Markup is all divs except the links (<a>). Classes used by breadcrumb.css:
 * breadcrumb-trail, -list, -item, -link, -current. The "›" separator is painted by the CSS.
 *
 * Output: div.breadcrumb > div.breadcrumb-trail[role=navigation] > div.breadcrumb-list[role=list]
 * Guide: blocks/breadcrumb/README.md
 */
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { getSafeHref } from '../../scripts/foundations/block-utils.js';
import {
  PAGE_CONTEXT_EVENT, fillPageContext, hasPageContext,
} from '../../scripts/foundations/page-context.js';

// accessible name of the navigation landmark (only read by screen readers)
const LANDMARK_LABEL = 'Ruta de navegación';
const LEVEL_ROW = /^level ?(\d+)$/;

/**
 * "Level N" rows sorted by N; each one with its text and, when it is a link, its href.
 * @param {Element} block
 * @returns {{text: string, href: string|null}[]}
 */
function readBreadcrumbLevels(block) {
  return [...block.querySelectorAll(':scope > div')]
    .map((row) => {
      const [keyCell, valueCell] = row.children;
      const number = Number(keyCell?.textContent.trim().toLowerCase().match(LEVEL_ROW)?.[1]);
      const link = valueCell?.querySelector('a');
      return {
        number,
        text: (link?.textContent || valueCell?.textContent || '').trim(),
        href: link ? getSafeHref(link.getAttribute('href')) : null,
      };
    })
    .filter((level) => Number.isFinite(level.number) && level.text)
    .sort((first, second) => first.number - second.number)
    .map(({ text, href }) => ({ text, href }));
}

/**
 * One level: a link, or the current page (the last level, never a link).
 * @param {{text: string, href: string|null}} level
 * @param {boolean} isCurrent
 * @returns {Element} div.breadcrumb-item[role=listitem]
 */
function buildBreadcrumbItem(level, isCurrent) {
  const item = document.createElement('div');
  item.className = 'breadcrumb-item';
  item.setAttribute('role', 'listitem');
  if (!isCurrent && level.href) {
    const link = document.createElement('a');
    link.className = 'breadcrumb-link';
    link.href = level.href;
    link.textContent = level.text;
    item.append(link);
  } else {
    const text = document.createElement('div');
    text.className = isCurrent ? 'breadcrumb-current' : 'breadcrumb-text';
    if (isCurrent) {
      text.setAttribute('aria-current', 'page');
    }
    text.textContent = level.text;
    item.append(text);
  }
  return item;
}

/**
 * Paints the trail; the dynamic levels take their values (fillPageContext), or are left out
 * while a value is missing.
 * @param {Element} block
 * @param {{text: string, href: string|null}[]} levels readBreadcrumbLevels() result
 */
function renderBreadcrumbTrail(block, levels) {
  const visibleLevels = levels
    .map((level) => ({
      ...level,
      text: fillPageContext(level.text),
    }))
    .filter((level) => level.text);
  if (!visibleLevels.length) {
    block.replaceChildren();
    return;
  }

  const list = document.createElement('div');
  list.className = 'breadcrumb-list';
  list.setAttribute('role', 'list');
  const lastIndex = visibleLevels.length - 1;
  list.append(...visibleLevels.map(
    (level, index) => buildBreadcrumbItem(level, index === lastIndex),
  ));

  const trail = document.createElement('div');
  trail.className = 'breadcrumb-trail';
  trail.setAttribute('role', 'navigation');
  trail.setAttribute('aria-label', LANDMARK_LABEL);
  trail.append(list);
  block.replaceChildren(trail);
}

/**
 * Breadcrumb. The block name gives the main .breadcrumb class that scopes every style.
 * @param {Element} block The breadcrumb block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // Styles / Classname / Session rows and session rows, before reading
  const levels = readBreadcrumbLevels(block);
  renderBreadcrumbTrail(block, levels);
  // any value of the page context that arrives later repaints the dynamic levels
  if (levels.some((level) => hasPageContext(level.text))) {
    document.addEventListener(PAGE_CONTEXT_EVENT, () => renderBreadcrumbTrail(block, levels));
  }
}
