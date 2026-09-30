import { readBlockConfig } from '../../scripts/aem.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import {
  readRawCell, alertOptions, safeHref, observeBalancedColumns,
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
// keep in sync with card-categories.css (card width, gap and breakpoint)
const CARD_MIN_WIDTH = 140;
const CARD_GAP = 16;
const multiColumn = window.matchMedia('(width >= 600px)');
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

function buildList(className) {
  const list = document.createElement('ul');
  list.className = className;
  return list;
}

function buildSkeleton() {
  const list = buildList('card-categories-list card-categories-loading');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_COUNT; i += 1) {
    const li = document.createElement('li');
    li.className = 'card-categories-skeleton';
    list.append(li);
  }
  return list;
}

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
 * Renders the cards, or the empty message when there is nothing to show.
 * @param {Element} block
 * @param {Object[]} categories Normalised categories
 */
function render(block, categories) {
  block.removeAttribute('aria-busy');
  if (!categories.length) {
    block.replaceChildren(buildEmpty());
    return;
  }
  const list = buildList('card-categories-list');
  list.setAttribute('aria-label', MESSAGES.listLabel);
  list.append(...categories.map(buildCard));
  block.replaceChildren(list);
  // 6 cards that do not fit in one row become 3 + 3 and stretch; one row keeps 140px cards
  observeBalancedColumns(list, { minWidth: CARD_MIN_WIDTH, gap: CARD_GAP, query: multiColumn });
}

/**
 * Loads categories from the service; on any error logs it, shows a floating alert and
 * the empty message.
 */
async function loadFromService(block, endpoint, alert) {
  try {
    const response = await get(endpoint);
    const categories = response?.data?.categories;
    if (!Array.isArray(categories)) {
      throw new Error('Unexpected response: data.categories is not a list');
    }
    render(block, normalize(categories));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-categories] Could not load categories from', endpoint, error);
    showToast(MESSAGES.error, alert);
    render(block, []);
  }
}

/**
 * Card Categories: category cards fed by a service (Endpoint row) or by the internal JSON.
 * The block name gives the main .card-categories class that scopes every style.
 * Optional rows: Alert Duration (seconds, 0 = until closed), Alert Color
 * (error | warning | info | success, or a hex colour).
 * @param {Element} block The card-categories block element
 */
export default function decorate(block) {
  const config = readBlockConfig(block);
  const cell = readRawCell(block, 'endpoint');
  const endpoint = cell.href || cell.text;
  const alert = alertOptions(config);

  if (!endpoint) {
    render(block, normalize(FALLBACK_CATEGORIES));
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(buildSkeleton());
  loadFromService(block, endpoint, alert);
}
