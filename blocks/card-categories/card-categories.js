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
 *   - Empty List Title / Description / Icon (readRowTextOrDefault): row missing → default
 *     (scripts/foundations/messages.js, EMPTY_LIST_ICON below); row present but empty →
 *     not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 * The list is named by the Title (aria-label with the title text).
 * The loading skeleton always paints SKELETON_ELEMENTS placeholder cards (below).
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)        Styles / Classname rows (foundations/block-options.js)
 *     ├─ readCategoriesSettings(block)             endpoint, alert, messages
 *     │    └─ readTableCell / readRowTextOrDefault / getAlertOptions (foundations/block-utils.js)
 *     ├─ buildSectionTitle(block, prefix) div[role=heading] from Title (foundations/block-utils.js)
 *     ├─ no endpoint → renderCategories(normalizeCategories(FALLBACK_CATEGORIES))
 *     └─ endpoint    → buildCategoriesSkeleton() + loadCategoriesFromService()
 *                       (not awaited: the page keeps loading)
 *                         ├─ get(endpoint)   scripts/api/http-client.js
 *                         ├─ ok    → renderCategories(normalizeCategories(data.categories))
 *                         └─ error → console.error + showToast(errorResponseMessage)
 *                                    + renderCategories([])
 *   renderCategories(block, header, categories, settings)
 *     ├─ none → buildEmptyListMessage() (blocks/empty-list-message, shared by the card blocks)
 *     └─ div.card-categories-list[role=list] > buildCategoryCard() per category
 *
 * Columns come from the grid (styles/foundations/grid.css), not from card-categories.css. The grid
 * is always container > row > col: div.card-categories-grid.container-fluid (no side padding: the
 * section already has it) > the list (and the skeleton) as a row (row row-gutter-16
 * row-gutter-y-16) > each card a column
 * (col-24 col-md-8 col-lg-4: 1 per row on mobile, 3 on tablet, 6 on desktop).
 *
 * Markup is all divs except each card's link (<a>). Classes used by card-categories.css:
 * card-categories-header, -heading, -item, -icon, -label, -skeleton. card-categories-grid,
 * -list and -card only name the grid levels (container, row, col). The empty message
 * (div.empty-list-message) comes from blocks/empty-list-message.
 *
 * Expected response: { data: { categories: [{ id, label, icon, path, color, active, order }] } }
 * Guides: documentation/02-integracion-endpoints.md, documentation/04-card-categories.md
 */
import { readBlockConfig } from '../../scripts/aem.js';
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/foundations/toast.js';
import MESSAGES from '../../scripts/foundations/messages.js';
import {
  readTableCell, readRowTextOrDefault, getAlertOptions, getSafeHref, buildSectionTitle,
} from '../../scripts/foundations/block-utils.js';
import { buildEmptyListMessage } from '../empty-list-message/empty-list-message.js';

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
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
// icon of the "no categories" message, unless the table has an Empty List Icon row
const EMPTY_LIST_ICON = '🗂️';

/**
 * Everything the block reads from its table, with the defaults applied.
 * @param {Element} block
 * @returns {{endpoint: string, alert: Object,
 *   messages: {errorResponseMessage: string, emptyListTitle: string,
 *     emptyListDescription: string, emptyListIcon: string}}}
 */
function readCategoriesSettings(block) {
  const readCellText = (key) => readTableCell(block, key).text;
  const endpointCell = readTableCell(block, 'endpoint');
  return {
    endpoint: endpointCell.href || endpointCell.text,
    alert: getAlertOptions(readBlockConfig(block)),
    messages: {
      errorResponseMessage: readCellText('error response message') || MESSAGES.errorResponseMessage,
      emptyListTitle: readRowTextOrDefault(block, 'empty list title', MESSAGES.emptyListTitle),
      emptyListDescription: readRowTextOrDefault(
        block,
        'empty list description',
        MESSAGES.emptyListDescription,
      ),
      emptyListIcon: readRowTextOrDefault(block, 'empty list icon', EMPTY_LIST_ICON),
    },
  };
}

/**
 * Keeps active categories with a label and a valid link, without duplicates, by `order`.
 * @param {Object[]} rawCategories Categories as they come (service or fallback)
 * @returns {Object[]} the normalised categories
 */
function normalizeCategories(rawCategories) {
  const seen = new Set();
  return (Array.isArray(rawCategories) ? rawCategories : [])
    .filter((item) => item && item.active !== false)
    .map((item) => ({
      id: String(item.id ?? item.label ?? ''),
      label: typeof item.label === 'string' ? item.label.trim() : '',
      icon: typeof item.icon === 'string' ? item.icon.trim() : '',
      href: getSafeHref(item.path),
      color: HEX_COLOR.test(item.color) ? item.color : '',
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : Number.MAX_SAFE_INTEGER,
    }))
    .filter((item) => {
      if (!item.label || !item.href || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((first, second) => first.order - second.order);
}

/**
 * createElement shortcut; content is always set as text (never HTML).
 * @param {string} tag
 * @param {string} className
 * @param {string} [content]
 * @returns {Element}
 */
function createElementWithClass(tag, className, content) {
  const node = document.createElement(tag);
  node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

/**
 * One category card; service data is only ever set as text.
 * @param {Object} category Normalised category
 * @returns {Element} div.card-categories-card[role=listitem]
 */
function buildCategoryCard(category) {
  const card = createElementWithClass('div', 'card-categories-card col-24 col-md-8 col-lg-4');
  card.setAttribute('role', 'listitem');
  const link = createElementWithClass('a', 'card-categories-item');
  link.href = category.href;
  if (category.color) link.style.setProperty('--card-categories-item-color', category.color);
  const icon = createElementWithClass('span', 'card-categories-icon', category.icon);
  icon.setAttribute('aria-hidden', 'true');
  link.append(icon, createElementWithClass('span', 'card-categories-label', category.label));
  card.append(link);
  return card;
}

/**
 * Grey placeholder cards shown while the service answers (avoids layout shift); same grid
 * columns as the real cards.
 * @returns {Element} div.card-categories-grid.container-fluid > row, hidden from screen readers
 */
function buildCategoriesSkeleton() {
  const list = createElementWithClass('div', 'card-categories-list row row-gutter-16 row-gutter-y-16');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_ELEMENTS; i += 1) {
    const cell = createElementWithClass('div', 'card-categories-card col-24 col-md-8 col-lg-4');
    cell.append(createElementWithClass('div', 'card-categories-skeleton'));
    list.append(cell);
  }
  const grid = createElementWithClass('div', 'card-categories-grid container-fluid');
  grid.append(list);
  return grid;
}

/**
 * Renders the header and the cards, or the empty message when there is nothing to show.
 * @param {Element} block
 * @param {Element|null} header Optional title (Title row)
 * @param {Object[]} categories Normalised categories
 * @param {Object} settings readCategoriesSettings() result
 */
function renderCategories(block, header, categories, settings) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!categories.length) {
    block.replaceChildren(...content, buildEmptyListMessage({
      icon: settings.messages.emptyListIcon,
      title: settings.messages.emptyListTitle,
      description: settings.messages.emptyListDescription,
    }));
    return;
  }
  const list = createElementWithClass('div', 'card-categories-list row row-gutter-16 row-gutter-y-16');
  list.setAttribute('role', 'list');
  // screen readers name the list with the visible title ("Categorías, lista, 6 elementos")
  const heading = header?.querySelector('.card-categories-heading');
  if (heading) list.setAttribute('aria-label', heading.textContent);
  list.append(...categories.map(buildCategoryCard));
  const grid = createElementWithClass('div', 'card-categories-grid container-fluid');
  grid.append(list);
  block.replaceChildren(...content, grid);
}

/**
 * Loads categories from the service; on any error logs it, shows a floating alert and
 * the empty message.
 * @param {Element} block
 * @param {Element|null} header
 * @param {Object} settings readCategoriesSettings() result
 */
async function loadCategoriesFromService(block, header, settings) {
  try {
    const response = await get(settings.endpoint);
    const rawCategories = response?.data?.categories;
    if (!Array.isArray(rawCategories)) {
      throw new Error('Unexpected response: data.categories is not a list');
    }
    const categories = normalizeCategories(rawCategories);
    renderCategories(block, header, categories, settings);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-categories] Could not load categories from', settings.endpoint, error);
    showToast(settings.messages.errorResponseMessage, settings.alert);
    renderCategories(block, header, [], settings);
  }
}

/**
 * Card Categories: category cards fed by a service (Endpoint row) or by the internal JSON.
 * The block name gives the main .card-categories class that scopes every style.
 * @param {Element} block The card-categories block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readCategoriesSettings(block);
  const header = buildSectionTitle(block, 'card-categories');

  if (!settings.endpoint) {
    const categories = normalizeCategories(FALLBACK_CATEGORIES);
    renderCategories(block, header, categories, settings);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildCategoriesSkeleton()].filter(Boolean));
  loadCategoriesFromService(block, header, settings);
}
