/*
 * Card Categories block: category cards from a service (Endpoint row) or the internal JSON.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Card Categories" table.
 *
 * Authored rows (all optional): Styles, Classname, Title, Endpoint, Alert Duration,
 * Alert Color, Error Response Message, Empty List Title, Empty List Description,
 * Empty List Icon.
 * Defaults only for messages and the alert:
 *   - Title has no default: without text in the table the section has no title.
 *   - Empty List Title / Description / Icon: row missing → default (scripts/messages.js,
 *     EMPTY_LIST_ICON below); row present but empty → not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 * The list is named by the Title through aria-labelledby.
 * The loading skeleton always paints SKELETON_ELEMENTS placeholder cards (below).
 *
 * Flow (shared helpers in scripts/block-utils.js):
 *   decorate(block)
 *     ├─ applyBlockOptions(block)          scripts/block-options.js → Styles / Classname rows
 *     ├─ readServiceSettings(block, icon)  endpoint, alert, messages
 *     ├─ buildBlockHeader(…, asDiv)        div[role=heading] from Title
 *     ├─ no endpoint → show(FALLBACK_CATEGORIES)
 *     └─ endpoint    → renderSkeleton() + loadServiceList('categories') → show(list)
 *                       (not awaited: the page keeps loading; on error alert + [])
 *   show(list) → renderCards(normalize(list).map(buildCard))   none → empty message
 *
 * Markup is all divs except each card's link (<a>). Classes used by card-categories.css:
 * card-categories-header, -heading, -list, -card, -item, -icon, -label, -skeleton,
 * -empty, -empty-icon, -empty-title, -empty-text.
 *
 * Expected response: { data: { categories: [{ id, label, icon, path, color, active, order }] } }
 * Guides: documentation/02-integracion-endpoints.md, documentation/04-card-categories.md
 */
import applyBlockOptions from '../../scripts/block-options.js';
import {
  readServiceSettings, buildBlockHeader, renderSkeleton, renderCards, loadServiceList,
  activeItems, uniqueById, orderValue, safeHref, safeColor, toText, el,
} from '../../scripts/block-utils.js';

const PREFIX = 'card-categories';

// used when the document has no Endpoint row; [] or null (no data) → the empty message
// directly, without alert
const FALLBACK_CATEGORIES = [
  {
    id: 'CAT-001', label: 'Celulares', icon: '📱', path: '/celulares', color: '#1a4fd8', active: true, order: 1,
  },
  {
    id: 'CAT-002', label: 'Planes', icon: '📶', path: '/planes', color: '#0b9ef0', active: true, order: 2,
  },
  {
    id: 'CAT-003', label: 'Accesorios', icon: '🎧', path: '/accesorios', color: '#7c3aed', active: true, order: 3,
  },
  {
    id: 'CAT-004', label: 'Hogar', icon: '🏠', path: '/hogar', color: '#059669', active: true, order: 4,
  },
  {
    id: 'CAT-005', label: 'Wearables', icon: '⌚', path: '/wearables', color: '#d97706', active: true, order: 5,
  },
  {
    id: 'CAT-006', label: 'Portabilidad', icon: '🔄', path: '/portabilidad', color: '#dc2626', active: true, order: 6,
  },
];

// grey placeholder cards painted while the service answers
const SKELETON_ELEMENTS = 6;
// icon of the "no categories" message, unless the table has an Empty List Icon row
const EMPTY_LIST_ICON = '🗂️';

/**
 * Keeps active categories with a label and a valid link, without duplicates, by `order`.
 * @param {*} list Raw categories (service or fallback); not a list gives []
 * @returns {Object[]}
 */
function normalize(list) {
  return uniqueById(activeItems(list)
    .map((item) => ({
      id: String(item.id ?? item.label ?? ''),
      label: toText(item.label),
      icon: toText(item.icon),
      href: safeHref(item.path),
      color: safeColor(item.color),
      order: orderValue(item.order),
    }))
    .filter((item) => item.label && item.href))
    .sort((a, b) => a.order - b.order);
}

/**
 * One category card; service data is only ever set as text.
 * @param {Object} category Normalised category
 * @returns {Element} div.card-categories-card[role=listitem]
 */
function buildCard(category) {
  const card = el('div', 'card-categories-card');
  card.setAttribute('role', 'listitem');
  const link = el('a', 'card-categories-item');
  link.href = category.href;
  if (category.color) link.style.setProperty('--card-categories-item-color', category.color);
  const icon = el('span', 'card-categories-icon', category.icon);
  icon.setAttribute('aria-hidden', 'true');
  link.append(icon, el('span', 'card-categories-label', category.label));
  card.append(link);
  return card;
}

/**
 * Card Categories: category cards fed by a service (Endpoint row) or by the internal JSON.
 * The block name gives the main .card-categories class that scopes every style.
 * @param {Element} block The card-categories block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readServiceSettings(block, EMPTY_LIST_ICON);
  const header = buildBlockHeader(block, PREFIX, { asDiv: true });
  const show = (list) => renderCards(
    block,
    PREFIX,
    header,
    normalize(list).map(buildCard),
    settings.messages,
  );

  if (!settings.endpoint) {
    show(FALLBACK_CATEGORIES);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  renderSkeleton(block, PREFIX, header, SKELETON_ELEMENTS);
  loadServiceList(settings.endpoint, 'categories', {
    source: PREFIX,
    errorMessage: settings.messages.errorResponseMessage,
    alert: settings.alert,
  }).then(show);
}
