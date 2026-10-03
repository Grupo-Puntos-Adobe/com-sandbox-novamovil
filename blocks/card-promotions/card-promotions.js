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
 *   - Empty List Title / Description / Icon: row missing → default (scripts/messages.js,
 *     EMPTY_LIST_ICON below); row present but empty → not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 * The list is named by the Title through aria-labelledby.
 * The loading skeleton always paints SKELETON_ELEMENTS placeholder cards (below).
 *
 * Flow (shared helpers in scripts/block-utils.js):
 *   decorate(block)
 *     ├─ applyBlockOptions(block)          scripts/block-options.js → Styles / Classname rows
 *     ├─ readServiceSettings(block, icon)  endpoint, alert, messages (+ Promo Link row)
 *     ├─ buildBlockHeader(…, asDiv)        div[role=heading] from Title
 *     ├─ no endpoint → show(FALLBACK_PROMOTIONS)
 *     └─ endpoint    → renderSkeleton() + loadServiceList('promotions') → show(list)
 *                       (not awaited: the page keeps loading; on error alert + [])
 *   show(list) → renderCards(normalize(list).map(buildCard))   none → empty message
 *
 * Markup is all divs except each card's link (<a>, a div when it has no link) and photo
 * (<img>). Classes used by card-promotions.css: card-promotions-header, -heading, -list,
 * -card, -item, -image, -content, -title, -sub, -skeleton, -empty, -empty-icon,
 * -empty-title, -empty-text.
 *
 * Expected response:
 *   { data: { promotions: [{ id, title, sub, color, img, active, order, path? }] } }
 * The gradient colour is passed to CSS as --card-promotions-item-color on each card.
 * Guides: documentation/02-integracion-endpoints.md, documentation/06-card-promotions.md
 */
import applyBlockOptions from '../../scripts/block-options.js';
import {
  readRawCell, readServiceSettings, buildBlockHeader, renderSkeleton, renderCards,
  loadServiceList, activeItems, uniqueById, orderValue, linkFromTemplate, safeHref, safeColor,
  toText, el,
} from '../../scripts/block-utils.js';

const PREFIX = 'card-promotions';

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
// placeholders allowed in the Promo Link row
const LINK_KEYS = ['id'];

/**
 * Active promotions with a title, without duplicates, by `order` (href null = no link).
 * @param {*} list Raw promotions (service or fallback); not a list gives []
 * @param {string} linkTemplate Promo Link row
 * @returns {Object[]}
 */
function normalize(list, linkTemplate) {
  return uniqueById(activeItems(list)
    .map((item) => ({
      id: String(item.id ?? item.title ?? ''),
      title: toText(item.title),
      sub: toText(item.sub),
      color: safeColor(item.color),
      image: safeHref(item.img || item.image),
      href: linkFromTemplate(item, linkTemplate, LINK_KEYS),
      order: orderValue(item.order),
    }))
    .filter((item) => item.title))
    .sort((a, b) => a.order - b.order);
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
 * Card Promotions: promotion cards fed by a service (Endpoint row) or the internal JSON.
 * The block name gives the main .card-promotions class that scopes every style.
 * @param {Element} block The card-promotions block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readServiceSettings(block, EMPTY_LIST_ICON);
  const linkTemplate = readRawCell(block, 'promo link').text;
  const header = buildBlockHeader(block, PREFIX, { asDiv: true });
  const show = (list) => renderCards(
    block,
    PREFIX,
    header,
    normalize(list, linkTemplate).map(buildCard),
    settings.messages,
  );

  if (!settings.endpoint) {
    show(FALLBACK_PROMOTIONS);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  renderSkeleton(block, PREFIX, header, SKELETON_ELEMENTS);
  loadServiceList(settings.endpoint, 'promotions', {
    source: PREFIX,
    errorMessage: settings.messages.errorResponseMessage,
    alert: settings.alert,
  }).then(show);
}
