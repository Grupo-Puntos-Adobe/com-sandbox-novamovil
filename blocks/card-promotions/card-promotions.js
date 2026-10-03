/*
 * Card Promotions block: promotion cards (photo + gradient in the promotion colour) from a
 * service (Endpoint row) or the internal JSON.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Card Promotions" table.
 *
 * Authored rows (all optional): Styles, Classname, Title, Endpoint,
 * Promo Link ("/promociones/{id}"), Alert Duration, Alert Color, Error Response Message,
 * Empty List Title, Empty List Description, Empty List Icon.
 * Defaults only for messages and the alert:
 *   - Title and Promo Link have no default: without text in the table there is no title,
 *     and a promotion without its own path has no link (the card is not clickable).
 *   - Empty List Title / Description / Icon (readRowText): row missing → default
 *     (scripts/messages.js, EMPTY_LIST_ICON below); row present but empty → not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 * The list is named by the Title through aria-labelledby.
 * The loading skeleton always paints SKELETON_ELEMENTS placeholder cards (below).
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)        scripts/block-options.js → Styles / Classname rows
 *     ├─ readSettings(block)             endpoint, promo link, alert, messages
 *     │    └─ readRawCell / readRowText / alertOptions   scripts/block-utils.js
 *     ├─ buildBlockHeader(…, asDiv)      scripts/block-utils.js → div[role=heading] from Title
 *     ├─ no endpoint → render(normalize(FALLBACK_PROMOTIONS))
 *     └─ endpoint    → buildSkeleton() + loadFromService()   (not awaited: the page keeps loading)
 *                         ├─ get(endpoint)   scripts/api/http-client.js
 *                         ├─ ok    → render(normalize(data.promotions))
 *                         └─ error → console.error + showToast(errorResponseMessage) + render([])
 *   render(block, header, promotions, settings)
 *     ├─ none → buildEmpty()
 *     └─ div.card-promotions-list[role=list] > buildCard() per promotion (columns: CSS)
 *
 * Markup is all divs except each card's link (<a>, a div when it has no link) and photo
 * (<img>). Classes used by
 * card-promotions.css: card-promotions-header, -heading, -list, -card, -item, -image,
 * -content, -title, -sub, -skeleton, -empty, -empty-icon, -empty-title, -empty-text.
 *
 * Expected response:
 *   { data: { promotions: [{ id, title, sub, color, img, active, order, path? }] } }
 * The gradient colour is passed to CSS as --card-promotions-item-color on each card.
 * Guides: documentation/02-integracion-endpoints.md, documentation/06-card-promotions.md
 */
import { readBlockConfig } from '../../scripts/aem.js';
import applyBlockOptions from '../../scripts/block-options.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import MESSAGES from '../../scripts/messages.js';
import {
  readRawCell, readRowText, alertOptions, safeHref, buildBlockHeader,
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

// grey placeholder cards painted while the service answers
const SKELETON_ELEMENTS = 3;
// icon of the "no promotions" message, unless the table has an Empty List Icon row
const EMPTY_LIST_ICON = '🏷️';
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
let headingCount = 0;

// service value → trimmed string ('' if not a string)
const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Everything the block reads from its table, with the defaults applied.
 * @param {Element} block
 * @returns {{endpoint: string, linkTemplate: string, alert: Object,
 *   messages: {errorResponseMessage: string, emptyListTitle: string,
 *     emptyListDescription: string, emptyListIcon: string}}}
 */
function readSettings(block) {
  const cell = (key) => readRawCell(block, key).text;
  const endpointCell = readRawCell(block, 'endpoint');
  return {
    endpoint: endpointCell.href || endpointCell.text,
    linkTemplate: cell('promo link'),
    alert: alertOptions(readBlockConfig(block)),
    messages: {
      errorResponseMessage: cell('error response message') || MESSAGES.errorResponseMessage,
      emptyListTitle: readRowText(block, 'empty list title', MESSAGES.emptyListTitle),
      emptyListDescription: readRowText(
        block,
        'empty list description',
        MESSAGES.emptyListDescription,
      ),
      emptyListIcon: readRowText(block, 'empty list icon', EMPTY_LIST_ICON),
    },
  };
}

/**
 * The promotion's own path/url, or the authored template (placeholder: {id}).
 * @param {Object} item Raw promotion
 * @param {string} template Promo Link row ('' when the table has none)
 * @returns {string|null} null without template or when the placeholder could not be filled
 */
function promoHref(item, template) {
  const own = safeHref(item.path || item.url);
  if (own) return own;
  if (!template) return null;
  const filled = template.replace(/\{id\}/g, encodeURIComponent(String(item.id ?? '').toLowerCase()));
  return /\{|\/$/.test(filled) ? null : safeHref(filled);
}

/**
 * Active promotions with a title, without duplicates, by `order` (href null = no link).
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
      if (!item.title || seen.has(item.id)) return false;
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
 * One promotion card: photo, gradient in the promotion colour (bottom → top), texts.
 * Service data is only ever set as text or validated URLs.
 * @param {Object} promo Normalised promotion
 * @returns {Element} div.card-promotions-card[role=listitem] > a.card-promotions-item
 *   (div.card-promotions-item when the promotion has no link)
 */
function buildCard(promo) {
  const card = el('div', 'card-promotions-card');
  card.setAttribute('role', 'listitem');
  const link = el(promo.href ? 'a' : 'div', 'card-promotions-item');
  if (promo.href) link.href = promo.href;
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

  card.append(link);
  return card;
}

/**
 * Grey placeholder cards shown while the service answers (avoids layout shift).
 * @returns {Element} div hidden from assistive technology
 */
function buildSkeleton() {
  const list = el('div', 'card-promotions-list');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_ELEMENTS; i += 1) list.append(el('div', 'card-promotions-skeleton'));
  return list;
}

/**
 * "No promotions" message: empty list or service error.
 * @param {Object} messages Empty List Title / Description (table or scripts/messages.js)
 *   and Empty List Icon (table or EMPTY_LIST_ICON)
 * @returns {Element} div[role=status]
 */
function buildEmpty(messages) {
  const empty = el('div', 'card-promotions-empty');
  empty.setAttribute('role', 'status');
  // each part only when it has text (an authored empty row leaves it out)
  if (messages.emptyListIcon) {
    const icon = el('div', 'card-promotions-empty-icon', messages.emptyListIcon);
    icon.setAttribute('aria-hidden', 'true');
    empty.append(icon);
  }
  if (messages.emptyListTitle) {
    empty.append(el('div', 'card-promotions-empty-title', messages.emptyListTitle));
  }
  if (messages.emptyListDescription) {
    empty.append(el('div', 'card-promotions-empty-text', messages.emptyListDescription));
  }
  return empty;
}

/**
 * Renders the header and the cards, or the empty message when there is nothing to show.
 * @param {Element} block
 * @param {Element|null} header Optional title (Title row)
 * @param {Object[]} promotions Normalised promotions
 * @param {Object} settings readSettings() result
 */
function render(block, header, promotions, settings) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!promotions.length) {
    block.replaceChildren(...content, buildEmpty(settings.messages));
    return;
  }
  const list = el('div', 'card-promotions-list');
  list.setAttribute('role', 'list');
  // screen readers name the list with the visible title ("Promociones, lista, 3 elementos")
  const heading = header?.querySelector('.card-promotions-heading');
  if (heading) {
    headingCount += 1;
    heading.id = heading.id || `card-promotions-heading-${headingCount}`;
    list.setAttribute('aria-labelledby', heading.id);
  }
  list.append(...promotions.map(buildCard));
  block.replaceChildren(...content, list);
}

/**
 * Loads promotions from the service; on any error logs it, shows a floating alert and
 * the empty message.
 * @param {Element} block
 * @param {Element|null} header
 * @param {Object} settings readSettings() result
 */
async function loadFromService(block, header, settings) {
  try {
    const response = await get(settings.endpoint);
    const promotions = response?.data?.promotions;
    if (!Array.isArray(promotions)) {
      throw new Error('Unexpected response: data.promotions is not a list');
    }
    render(block, header, normalize(promotions, settings.linkTemplate), settings);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-promotions] Could not load promotions from', settings.endpoint, error);
    showToast(settings.messages.errorResponseMessage, settings.alert);
    render(block, header, [], settings);
  }
}

/**
 * Card Promotions: promotion cards fed by a service (Endpoint row) or the internal JSON.
 * The block name gives the main .card-promotions class that scopes every style.
 * @param {Element} block The card-promotions block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readSettings(block);
  const header = buildBlockHeader(block, 'card-promotions', { asDiv: true });

  if (!settings.endpoint) {
    render(block, header, normalize(FALLBACK_PROMOTIONS, settings.linkTemplate), settings);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildSkeleton()].filter(Boolean));
  loadFromService(block, header, settings);
}
