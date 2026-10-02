/*
 * Card Categories block: category cards from a service (Endpoint row) or the internal JSON.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Card Categories" table.
 *
 * Authored rows (all optional): Styles, Classname, Title, Endpoint, Alert Duration, Alert Color.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)        scripts/block-options.js → Styles / Classname rows
 *     ├─ readBlockConfig(block)          scripts/aem.js → alert-duration, alert-color
 *     ├─ readRawCell(block, 'endpoint')  scripts/block-utils.js → endpoint exactly as authored
 *     ├─ alertOptions(config)            scripts/block-utils.js → { duration, variant }
 *     ├─ buildBlockHeader(block, …)      scripts/block-utils.js → h2 from the Title row
 *     ├─ no endpoint → render(normalize(FALLBACK_CATEGORIES))
 *     └─ endpoint    → buildSkeleton() + loadFromService()   (not awaited: the page keeps loading)
 *                         ├─ get(endpoint)   scripts/api/http-client.js
 *                         ├─ ok    → render(normalize(data.categories))
 *                         └─ error → console.error + showToast() (scripts/toast.js) + render([])
 *   render(block, header, categories)
 *     ├─ none → buildEmpty()
 *     └─ buildCard() per category, inside ul.card-grid (columns: card-categories.css)
 *
 * Expected response: { data: { categories: [{ id, label, icon, path, color, active, order }] } }
 * Guide: documentation/02-integracion-endpoints.md
 */
import { readBlockConfig } from '../../scripts/aem.js';
import applyBlockOptions from '../../scripts/block-options.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import {
  readRawCell, alertOptions, safeHref, buildBlockHeader,
} from '../../scripts/block-utils.js';

// used when the document has no Endpoint row
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

const SKELETON_COUNT = 6;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const MESSAGES = {
  error: 'No pudimos cargar las categorías. Intenta de nuevo más tarde.',
  emptyTitle: 'Por ahora no hay categorías disponibles',
  emptyText: 'Vuelve pronto para descubrir nuestras novedades.',
  listLabel: 'Categorías',
};

/**
 * Keeps active categories with a label and a valid link, without duplicates, by `order`.
 * @param {Object[]} list Raw categories (service or fallback)
 * @returns {Object[]}
 */
function normalize(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && item.active !== false)
    .map((item) => ({
      id: String(item.id ?? item.label ?? ''),
      label: typeof item.label === 'string' ? item.label.trim() : '',
      icon: typeof item.icon === 'string' ? item.icon.trim() : '',
      href: safeHref(item.path),
      color: HEX_COLOR.test(item.color) ? item.color : '',
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : Number.MAX_SAFE_INTEGER,
    }))
    .filter((item) => {
      if (!item.label || !item.href || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * One category card; service data is only ever set as text.
 * @param {Object} category Normalised category
 * @returns {Element} li
 */
function buildCard(category) {
  const li = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'card-categories-item';
  link.href = category.href;
  if (category.color) link.style.setProperty('--card-categories-item-color', category.color);

  const icon = document.createElement('span');
  icon.className = 'card-categories-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = category.icon;

  const label = document.createElement('span');
  label.className = 'card-categories-label';
  label.textContent = category.label;

  link.append(icon, label);
  li.append(link);
  return li;
}

/**
 * @param {string} className
 * @returns {Element} empty ul
 */
function buildList(className) {
  const list = document.createElement('ul');
  list.className = className;
  return list;
}

/**
 * Grey placeholder cards shown while the service answers (avoids layout shift).
 * @returns {Element} ul hidden from assistive technology
 */
function buildSkeleton() {
  const list = buildList('card-categories-list card-categories-loading card-grid card-grid-compact');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_COUNT; i += 1) {
    const li = document.createElement('li');
    li.className = 'card-categories-skeleton';
    list.append(li);
  }
  return list;
}

/**
 * "No categories" message: empty list or service error.
 * @returns {Element} div[role=status]
 */
function buildEmpty() {
  const empty = document.createElement('div');
  empty.className = 'card-categories-empty';
  empty.setAttribute('role', 'status');

  const icon = document.createElement('span');
  icon.className = 'card-categories-empty-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '🗂️';
  const title = document.createElement('p');
  title.className = 'card-categories-empty-title';
  title.textContent = MESSAGES.emptyTitle;
  const text = document.createElement('p');
  text.className = 'card-categories-empty-text';
  text.textContent = MESSAGES.emptyText;

  empty.append(icon, title, text);
  return empty;
}

/**
 * Renders the header and the cards, or the empty message when there is nothing to show.
 * @param {Element} block
 * @param {Element|null} header Optional title (Title row)
 * @param {Object[]} categories Normalised categories
 */
function render(block, header, categories) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!categories.length) {
    block.replaceChildren(...content, buildEmpty());
    return;
  }
  const list = buildList('card-categories-list card-grid card-grid-compact');
  list.setAttribute('aria-label', header?.querySelector('h2')?.textContent || MESSAGES.listLabel);
  list.append(...categories.map(buildCard));
  block.replaceChildren(...content, list);
}

/**
 * Loads categories from the service; on any error logs it, shows a floating alert and
 * the empty message.
 * @param {Element} block
 * @param {Element|null} header
 * @param {string} endpoint Full URL or path relative to API_BASE_URL
 * @param {{duration: number, variant: string}} alert showToast options
 */
async function loadFromService(block, header, endpoint, alert) {
  try {
    const response = await get(endpoint);
    const categories = response?.data?.categories;
    if (!Array.isArray(categories)) {
      throw new Error('Unexpected response: data.categories is not a list');
    }
    render(block, header, normalize(categories));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-categories] Could not load categories from', endpoint, error);
    showToast(MESSAGES.error, alert);
    render(block, header, []);
  }
}

/**
 * Card Categories: category cards fed by a service (Endpoint row) or by the internal JSON.
 * The block name gives the main .card-categories class that scopes every style.
 * Optional rows: Title, Alert Duration (seconds, 0 = until closed), Alert Color
 * (error | warning | info | success, or a hex colour).
 * @param {Element} block The card-categories block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const config = readBlockConfig(block);
  const cell = readRawCell(block, 'endpoint');
  const endpoint = cell.href || cell.text;
  const alert = alertOptions(config);
  const header = buildBlockHeader(block, 'card-categories');

  if (!endpoint) {
    render(block, header, normalize(FALLBACK_CATEGORIES));
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildSkeleton()].filter(Boolean));
  loadFromService(block, header, endpoint, alert);
}
