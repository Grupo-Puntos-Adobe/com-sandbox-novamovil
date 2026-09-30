import { readBlockConfig } from '../../scripts/aem.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import {
  readRawCell, alertOptions, safeHref, observeBalancedColumns, buildBlockHeader,
} from '../../scripts/block-utils.js';

// used when the document has no Endpoint row
const FALLBACK_PROMOTIONS = [
  {
    id: 'PROMO-001',
    title: 'Hasta 12 MSI',
    sub: 'En celulares seleccionados con tarjeta NovaPay',
    color: '#1a4fd8',
    img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=220&fit=crop&auto=format',
    active: true,
    order: 1,
  },
  {
    id: 'PROMO-002',
    title: 'Plan + Equipo',
    sub: 'Desde $399/mes. Incluye 30 GB y llamadas ilimitadas',
    color: '#059669',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=220&fit=crop&auto=format',
    active: true,
    order: 2,
  },
  {
    id: 'PROMO-003',
    title: 'Portabilidad',
    sub: 'Cambia a NovaMóvil y recibe $500 de bono en tu cuenta',
    color: '#7c3aed',
    img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=220&fit=crop&auto=format',
    active: true,
    order: 3,
  },
];

const SKELETON_COUNT = 3;
// keep in sync with card-promotions.css (card width, gap and breakpoint)
const CARD_MIN_WIDTH = 200;
const CARD_GAP = 20;
const MAX_COLUMNS = 3; // the design shows three promotions per row on desktop
const multiColumn = window.matchMedia('(width >= 768px)');
const DEFAULT_PROMO_LINK = '/promociones/{id}';
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const MESSAGES = {
  error: 'No pudimos cargar las promociones. Intenta de nuevo más tarde.',
  emptyTitle: 'Por ahora no hay promociones disponibles',
  emptyText: 'Vuelve pronto para descubrir nuestras nuevas ofertas.',
};

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * The promotion's own path/url, or the authored template (placeholder: {id}).
 */
function promoHref(item, template) {
  const own = safeHref(item.path || item.url);
  if (own) return own;
  const filled = template.replace(/\{id\}/g, encodeURIComponent(String(item.id ?? '').toLowerCase()));
  return /\{|\/$/.test(filled) ? null : safeHref(filled);
}

/**
 * Active promotions with a title and a valid link, without duplicates, by `order`.
 * @param {Object[]} list Raw promotions (service or fallback)
 * @param {string} linkTemplate
 * @returns {Object[]}
 */
function normalize(list, linkTemplate) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && item.active !== false)
    .map((item) => ({
      id: String(item.id ?? item.title ?? ''),
      title: text(item.title),
      sub: text(item.sub),
      color: HEX_COLOR.test(item.color) ? item.color : '',
      image: safeHref(item.img || item.image),
      href: promoHref(item, linkTemplate),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : Number.MAX_SAFE_INTEGER,
    }))
    .filter((item) => {
      if (!item.title || !item.href || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

/**
 * One promotion card: photo, gradient in the promotion colour (bottom → top), texts.
 * Service data is only ever set as text or validated URLs.
 */
function buildCard(promo) {
  const li = el('li');
  const link = el('a', 'card-promotions-item');
  link.href = promo.href;
  if (promo.color) link.style.setProperty('--card-promotions-item-color', promo.color);

  if (promo.image) {
    const img = el('img', 'card-promotions-image');
    img.src = promo.image;
    img.alt = ''; // decorative: the title and text describe the promotion
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 400;
    img.height = 220;
    img.addEventListener('error', () => img.remove(), { once: true });
    link.append(img);
  }

  const content = el('span', 'card-promotions-content');
  content.append(el('span', 'card-promotions-title', promo.title));
  if (promo.sub) content.append(el('span', 'card-promotions-sub', promo.sub));
  link.append(content);

  li.append(link);
  return li;
}

function buildSkeleton() {
  const list = el('ul', 'card-promotions-list');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_COUNT; i += 1) list.append(el('li', 'card-promotions-skeleton'));
  return list;
}

function buildEmpty() {
  const empty = el('div', 'card-promotions-empty');
  empty.setAttribute('role', 'status');
  const icon = el('span', 'card-promotions-empty-icon', '🏷️');
  icon.setAttribute('aria-hidden', 'true');
  empty.append(
    icon,
    el('p', 'card-promotions-empty-title', MESSAGES.emptyTitle),
    el('p', 'card-promotions-empty-text', MESSAGES.emptyText),
  );
  return empty;
}

/**
 * Renders the header and the cards (or the empty message).
 */
function render(block, header, promotions) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!promotions.length) {
    block.replaceChildren(...content, buildEmpty());
    return;
  }
  const list = el('ul', 'card-promotions-list');
  const heading = header?.querySelector('h2');
  if (heading) list.setAttribute('aria-label', heading.textContent);
  list.append(...promotions.map(buildCard));
  block.replaceChildren(...content, list);
  // up to three equal cards per row filling the width; rows are balanced
  observeBalancedColumns(list, {
    minWidth: CARD_MIN_WIDTH,
    gap: CARD_GAP,
    query: multiColumn,
    fillSingleRow: true,
    maxColumns: MAX_COLUMNS,
  });
}

/**
 * Loads promotions from the service; on any error logs it, shows a floating alert and
 * the empty message.
 */
async function loadFromService(block, header, endpoint, linkTemplate, alert) {
  try {
    const response = await get(endpoint);
    const promotions = response?.data?.promotions;
    if (!Array.isArray(promotions)) throw new Error('Unexpected response: data.promotions is not a list');
    render(block, header, normalize(promotions, linkTemplate));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-promotions] Could not load promotions from', endpoint, error);
    showToast(MESSAGES.error, alert);
    render(block, header, []);
  }
}

/**
 * Card Promotions: promotion cards fed by a service (Endpoint row) or the internal JSON.
 * The block name gives the main .card-promotions class that scopes every style.
 * Rows (all optional): Title, Endpoint, Promo Link ("/promociones/{id}"),
 * Alert Duration (seconds), Alert Color.
 * @param {Element} block The card-promotions block element
 */
export default function decorate(block) {
  const config = readBlockConfig(block);
  const endpointCell = readRawCell(block, 'endpoint');
  const endpoint = endpointCell.href || endpointCell.text;
  const linkTemplate = readRawCell(block, 'promo link').text || DEFAULT_PROMO_LINK;
  const header = buildBlockHeader(block, 'card-promotions');
  const alert = alertOptions(config);

  if (!endpoint) {
    render(block, header, normalize(FALLBACK_PROMOTIONS, linkTemplate));
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildSkeleton()].filter(Boolean));
  loadFromService(block, header, endpoint, linkTemplate, alert);
}
