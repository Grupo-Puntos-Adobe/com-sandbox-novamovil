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
 *   - Empty List Title / Description / Icon (readRowTextOrDefault): row missing → default
 *     (scripts/messages.js, EMPTY_LIST_ICON below); row present but empty → not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 * The list is named by the Title (aria-label with the title text).
 * The loading skeleton always paints SKELETON_ELEMENTS placeholder cards (below).
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)        scripts/block-options.js → Styles / Classname rows
 *     ├─ readPromotionsSettings(block)             endpoint, promo link, alert, messages
 *     │    └─ readTableCell / readRowTextOrDefault / getAlertOptions   scripts/block-utils.js
 *     ├─ buildBlockHeader(…, asDiv)      scripts/block-utils.js → div[role=heading] from Title
 *     ├─ no endpoint → renderPromotions(normalizePromotions(FALLBACK_PROMOTIONS))
 *     └─ endpoint    → buildPromotionsSkeleton() + loadPromotionsFromService()
 *                       (not awaited: the page keeps loading)
 *                         ├─ get(endpoint)   scripts/api/http-client.js
 *                         ├─ ok    → renderPromotions(normalizePromotions(data.promotions))
 *                         └─ error → console.error + showToast(errorResponseMessage)
 *                                    + renderPromotions([])
 *   renderPromotions(block, header, promotions, settings)
 *     ├─ none → buildEmptyListMessage()
 *     └─ div.card-promotions-list[role=list] > buildPromotionCard() per promotion
 *
 * Columns come from the grid (styles/foundations/grid.css), not from card-promotions.css: the
 * list (and the skeleton) is a row (row row-gutter-16 row-gutter-y-16) and each card a column
 * (col-24 col-md-8: 1 per row on mobile, 3 on tablet and desktop).
 *
 * Markup is all divs except each card's link (<a>, a div when it has no link) and photo
 * (<img>). Classes used by card-promotions.css: card-promotions-header, -heading, -list,
 * -card, -item, -image, -content, -title, -sub, -skeleton, -empty, -empty-icon, -empty-title,
 * -empty-text.
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
  readTableCell, readRowTextOrDefault, getAlertOptions, getSafeHref, buildBlockHeader,
} from '../../scripts/block-utils.js';

// used when the document has no Endpoint row; [] or null (no data) → the empty message
// directly, without alert
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

// service value → trimmed string ('' if not a string)
const toTrimmedText = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Everything the block reads from its table, with the defaults applied.
 * @param {Element} block
 * @returns {{endpoint: string, linkTemplate: string, alert: Object,
 *   messages: {errorResponseMessage: string, emptyListTitle: string,
 *     emptyListDescription: string, emptyListIcon: string}}}
 */
function readPromotionsSettings(block) {
  const readCellText = (key) => readTableCell(block, key).text;
  const endpointCell = readTableCell(block, 'endpoint');
  return {
    endpoint: endpointCell.href || endpointCell.text,
    linkTemplate: readCellText('promo link'),
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
 * The promotion's own path/url, or the authored template (placeholder: {id}).
 * @param {Object} item Raw promotion
 * @param {string} template Promo Link row ('' when the table has none)
 * @returns {string|null} null without template or when the placeholder could not be filled
 */
function buildPromotionHref(item, template) {
  const own = getSafeHref(item.path || item.url);
  if (own) return own;
  if (!template) return null;
  const filled = template.replace(/\{id\}/g, encodeURIComponent(String(item.id ?? '').toLowerCase()));
  return /\{|\/$/.test(filled) ? null : getSafeHref(filled);
}

/**
 * Active promotions with a title, without duplicates, by `order` (href null = no link).
 * @param {Object[]} list Raw promotions (service or fallback)
 * @param {string} linkTemplate
 * @returns {Object[]}
 */
function normalizePromotions(list, linkTemplate) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && item.active !== false)
    .map((item) => ({
      id: String(item.id ?? item.title ?? ''),
      title: toTrimmedText(item.title),
      sub: toTrimmedText(item.sub),
      color: HEX_COLOR.test(item.color) ? item.color : '',
      image: getSafeHref(item.img || item.image),
      href: buildPromotionHref(item, linkTemplate),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : Number.MAX_SAFE_INTEGER,
    }))
    .filter((item) => {
      if (!item.title || seen.has(item.id)) return false;
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
 * One promotion card: photo, gradient in the promotion colour (bottom → top), texts.
 * Service data is only ever set as text or validated URLs.
 * @param {Object} promo Normalised promotion
 * @returns {Element} div.card-promotions-card[role=listitem] > a.card-promotions-item
 *   (div.card-promotions-item when the promotion has no link)
 */
function buildPromotionCard(promo) {
  const card = createElementWithClass('div', 'card-promotions-card col-24 col-md-8');
  card.setAttribute('role', 'listitem');
  const link = createElementWithClass(promo.href ? 'a' : 'div', 'card-promotions-item');
  if (promo.href) link.href = promo.href;
  if (promo.color) link.style.setProperty('--card-promotions-item-color', promo.color);

  if (promo.image) {
    const img = createElementWithClass('img', 'card-promotions-image');
    img.src = promo.image;
    img.alt = ''; // decorative: the title and text describe the promotion
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => img.remove(), { once: true });
    link.append(img);
  }

  const content = createElementWithClass('span', 'card-promotions-content');
  content.append(createElementWithClass('span', 'card-promotions-title', promo.title));
  if (promo.sub) content.append(createElementWithClass('span', 'card-promotions-sub', promo.sub));
  link.append(content);

  card.append(link);
  return card;
}

/**
 * Grey placeholder cards shown while the service answers (avoids layout shift); same grid
 * columns as the real cards.
 * @returns {Element} div hidden from assistive technology
 */
function buildPromotionsSkeleton() {
  const list = createElementWithClass('div', 'card-promotions-list row row-gutter-16 row-gutter-y-16');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_ELEMENTS; i += 1) {
    const cell = createElementWithClass('div', 'card-promotions-card col-24 col-md-8');
    cell.append(createElementWithClass('div', 'card-promotions-skeleton'));
    list.append(cell);
  }
  return list;
}

/**
 * "No promotions" message: empty list or service error.
 * @param {Object} messages Empty List Title / Description (table or scripts/messages.js)
 *   and Empty List Icon (table or EMPTY_LIST_ICON)
 * @returns {Element} div[role=status]
 */
function buildEmptyListMessage(messages) {
  const empty = createElementWithClass('div', 'card-promotions-empty');
  empty.setAttribute('role', 'status');
  // each part only when it has text (an authored empty row leaves it out)
  if (messages.emptyListIcon) {
    const icon = createElementWithClass('div', 'card-promotions-empty-icon', messages.emptyListIcon);
    icon.setAttribute('aria-hidden', 'true');
    empty.append(icon);
  }
  if (messages.emptyListTitle) {
    empty.append(createElementWithClass('div', 'card-promotions-empty-title', messages.emptyListTitle));
  }
  if (messages.emptyListDescription) {
    empty.append(createElementWithClass('div', 'card-promotions-empty-text', messages.emptyListDescription));
  }
  return empty;
}

/**
 * Renders the header and the cards, or the empty message when there is nothing to show.
 * @param {Element} block
 * @param {Element|null} header Optional title (Title row)
 * @param {Object[]} promotions Normalised promotions
 * @param {Object} settings readPromotionsSettings() result
 */
function renderPromotions(block, header, promotions, settings) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!promotions.length) {
    block.replaceChildren(...content, buildEmptyListMessage(settings.messages));
    return;
  }
  const list = createElementWithClass('div', 'card-promotions-list row row-gutter-16 row-gutter-y-16');
  list.setAttribute('role', 'list');
  // screen readers name the list with the visible title ("Promociones, lista, 3 elementos")
  const heading = header?.querySelector('.card-promotions-heading');
  if (heading) list.setAttribute('aria-label', heading.textContent);
  list.append(...promotions.map(buildPromotionCard));
  block.replaceChildren(...content, list);
}

/**
 * Loads promotions from the service; on any error logs it, shows a floating alert and
 * the empty message.
 * @param {Element} block
 * @param {Element|null} header
 * @param {Object} settings readPromotionsSettings() result
 */
async function loadPromotionsFromService(block, header, settings) {
  try {
    const response = await get(settings.endpoint);
    const promotions = response?.data?.promotions;
    if (!Array.isArray(promotions)) {
      throw new Error('Unexpected response: data.promotions is not a list');
    }
    const validPromotions = normalizePromotions(promotions, settings.linkTemplate);
    renderPromotions(block, header, validPromotions, settings);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-promotions] Could not load promotions from', settings.endpoint, error);
    showToast(settings.messages.errorResponseMessage, settings.alert);
    renderPromotions(block, header, [], settings);
  }
}

/**
 * Card Promotions: promotion cards fed by a service (Endpoint row) or the internal JSON.
 * The block name gives the main .card-promotions class that scopes every style.
 * @param {Element} block The card-promotions block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readPromotionsSettings(block);
  const header = buildBlockHeader(block, 'card-promotions', { asDiv: true });

  if (!settings.endpoint) {
    const validPromotions = normalizePromotions(FALLBACK_PROMOTIONS, settings.linkTemplate);
    renderPromotions(block, header, validPromotions, settings);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildPromotionsSkeleton()].filter(Boolean));
  loadPromotionsFromService(block, header, settings);
}
