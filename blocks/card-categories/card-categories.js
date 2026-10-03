/*
 * Card Categories block: category cards from a service (Endpoint row) or the internal JSON.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Card Categories" table.
 *
 * Authored rows (all optional): Styles, Classname, Title, Endpoint, Alert Duration,
 * Alert Color, Error Message, Empty Title, Empty Text, List Label, Skeleton Count.
 * Texts missing in the table come from scripts/messages.js (generic messages);
 * Skeleton Count missing or invalid uses SKELETON_COUNT below.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)        scripts/block-options.js → Styles / Classname rows
 *     ├─ readSettings(block)             endpoint, alert, messages, skeleton count
 *     │    └─ readRawCell / alertOptions scripts/block-utils.js · MESSAGES scripts/messages.js
 *     ├─ buildBlockHeader(…, asDiv)      scripts/block-utils.js → div[role=heading] from Title
 *     ├─ no endpoint → render(normalize(FALLBACK_CATEGORIES))
 *     └─ endpoint    → buildSkeleton() + loadFromService()   (not awaited: the page keeps loading)
 *                         ├─ get(endpoint)   scripts/api/http-client.js
 *                         ├─ ok    → render(normalize(data.categories))
 *                         └─ error → console.error + showToast(messages.error) + render([])
 *   render(block, header, categories, settings)
 *     ├─ none → buildEmpty()
 *     └─ div.card-categories-list[role=list] > buildCard() per category (columns: CSS)
 *
 * Markup is all divs except each card's link (<a>). Classes used by card-categories.css:
 * card-categories-header, -heading, -list, -card, -item, -icon, -label, -skeleton,
 * -empty, -empty-icon, -empty-title, -empty-text.
 *
 * Expected response: { data: { categories: [{ id, label, icon, path, color, active, order }] } }
 * Guides: documentation/02-integracion-endpoints.md, documentation/04-card-categories.md
 */
import { readBlockConfig } from '../../scripts/aem.js';
import applyBlockOptions from '../../scripts/block-options.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import MESSAGES from '../../scripts/messages.js';
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

// placeholder cards while the service answers, unless the table has a Skeleton Count row
const SKELETON_COUNT = 6;
const MAX_SKELETON_COUNT = 24;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const EMPTY_ICON = '🗂️';

/**
 * Everything the block reads from its table, with the defaults applied.
 * @param {Element} block
 * @returns {{endpoint: string, alert: Object, skeletonCount: number,
 *   messages: {error: string, emptyTitle: string, emptyText: string, listLabel: string}}}
 */
function readSettings(block) {
  const text = (key) => readRawCell(block, key).text;
  const endpointCell = readRawCell(block, 'endpoint');
  const count = Number(text('skeleton count'));
  return {
    endpoint: endpointCell.href || endpointCell.text,
    alert: alertOptions(readBlockConfig(block)),
    skeletonCount: Number.isInteger(count) && count >= 1 && count <= MAX_SKELETON_COUNT
      ? count : SKELETON_COUNT,
    messages: {
      error: text('error message') || MESSAGES.error,
      emptyTitle: text('empty title') || MESSAGES.emptyTitle,
      emptyText: text('empty text') || MESSAGES.emptyText,
      listLabel: text('list label') || text('title') || MESSAGES.listLabel,
    },
  };
}

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
 * createElement shortcut; content is always set as text (never HTML).
 * @param {string} tag
 * @param {string} className
 * @param {string} [content]
 * @returns {Element}
 */
function el(tag, className, content) {
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
 * Grey placeholder cards shown while the service answers (avoids layout shift).
 * @param {number} count Skeleton Count row or SKELETON_COUNT
 * @returns {Element} div hidden from assistive technology
 */
function buildSkeleton(count) {
  const list = el('div', 'card-categories-list');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i += 1) list.append(el('div', 'card-categories-skeleton'));
  return list;
}

/**
 * "No categories" message: empty list or service error.
 * @param {Object} messages Empty Title / Empty Text (table or scripts/messages.js)
 * @returns {Element} div[role=status]
 */
function buildEmpty(messages) {
  const empty = el('div', 'card-categories-empty');
  empty.setAttribute('role', 'status');
  const icon = el('div', 'card-categories-empty-icon', EMPTY_ICON);
  icon.setAttribute('aria-hidden', 'true');
  empty.append(
    icon,
    el('div', 'card-categories-empty-title', messages.emptyTitle),
    el('div', 'card-categories-empty-text', messages.emptyText),
  );
  return empty;
}

/**
 * Renders the header and the cards, or the empty message when there is nothing to show.
 * @param {Element} block
 * @param {Element|null} header Optional title (Title row)
 * @param {Object[]} categories Normalised categories
 * @param {Object} settings readSettings() result
 */
function render(block, header, categories, settings) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!categories.length) {
    block.replaceChildren(...content, buildEmpty(settings.messages));
    return;
  }
  const list = el('div', 'card-categories-list');
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', settings.messages.listLabel);
  list.append(...categories.map(buildCard));
  block.replaceChildren(...content, list);
}

/**
 * Loads categories from the service; on any error logs it, shows a floating alert and
 * the empty message.
 * @param {Element} block
 * @param {Element|null} header
 * @param {Object} settings readSettings() result
 */
async function loadFromService(block, header, settings) {
  try {
    const response = await get(settings.endpoint);
    const categories = response?.data?.categories;
    if (!Array.isArray(categories)) {
      throw new Error('Unexpected response: data.categories is not a list');
    }
    render(block, header, normalize(categories), settings);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-categories] Could not load categories from', settings.endpoint, error);
    showToast(settings.messages.error, settings.alert);
    render(block, header, [], settings);
  }
}

/**
 * Card Categories: category cards fed by a service (Endpoint row) or by the internal JSON.
 * The block name gives the main .card-categories class that scopes every style.
 * @param {Element} block The card-categories block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readSettings(block);
  const header = buildBlockHeader(block, 'card-categories', { asDiv: true });

  if (!settings.endpoint) {
    render(block, header, normalize(FALLBACK_CATEGORIES), settings);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildSkeleton(settings.skeletonCount)].filter(Boolean));
  loadFromService(block, header, settings);
}
