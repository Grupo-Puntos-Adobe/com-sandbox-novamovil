/*
 * Card Featured block: featured product cards from a service (Endpoint row) or the internal JSON.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Card Featured" table.
 *
 * Authored rows (all optional): Styles, Classname, Title, Link ("Ver todos"), Endpoint,
 * Product Link ("/productos/{sku}"), Button Text, Alert Duration, Alert Color,
 * Error Response Message, Empty List Title, Empty List Description, Empty List Icon,
 * Image Error Message.
 * Defaults only for messages and the alert:
 *   - Title, Link, Button Text and Product Link have no default: without text in the
 *     table that part is not painted. Without Button Text the product name is the link;
 *     without Product Link (and no path from the service) the card has no link.
 *   - Empty List Title / Description / Icon and Image Error Message (readRowText): row
 *     missing → default (scripts/messages.js, EMPTY_LIST_ICON below); row present but
 *     empty → not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 * Prices use LOCALE and CURRENCY from scripts/messages.js.
 * The list is named by the Title through aria-labelledby.
 * The loading skeleton always paints SKELETON_ELEMENTS placeholder cards (below).
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)        scripts/block-options.js → Styles / Classname rows
 *     ├─ readSettings(block)             endpoint, product link, alert, title, messages
 *     │    └─ readRawCell / readRowText / alertOptions   scripts/block-utils.js
 *     ├─ buildBlockHeader(…, asDiv)      scripts/block-utils.js → div[role=heading] + "Ver todos"
 *     ├─ no endpoint → render(normalize(FALLBACK_PRODUCTS))
 *     └─ endpoint    → buildSkeleton() + loadFromService()   (not awaited: the page keeps loading)
 *                         ├─ get(endpoint)   scripts/api/http-client.js
 *                         ├─ ok    → render(normalize(data.products))
 *                         └─ error → console.error + showToast(errorResponseMessage) + render([])
 *   render(block, header, products, settings)
 *     ├─ none → buildEmpty()
 *     └─ div.card-featured-list[role=list] > buildCard() per product (columns: CSS)
 *          └─ buildMedia() · buildRating() · buildPrices() (formatPrice) · buildLink()
 *
 * Markup is all divs except the product image (<img>) and the links (<a>). Classes used by
 * card-featured.css: card-featured-header, -heading, -link, -list, -item, -media, -image,
 * -media-fallback, -badge, -promo, -body, -brand, -name, -name-link, -rating, -stars,
 * -reviews, -prices, -price, -old-price, -button, -sr-only, -skeleton, -empty,
 * -empty-icon, -empty-title, -empty-text.
 *
 * Expected response: { data: { products: [{ id, sku, brand, name, description, image, price,
 *   oldPrice, promo, currency, rating, reviews, badge, active, path? }] } }
 * Guides: documentation/02-integracion-endpoints.md, documentation/05-card-featured.md
 */
import { readBlockConfig } from '../../scripts/aem.js';
import applyBlockOptions from '../../scripts/block-options.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import MESSAGES, { LOCALE, CURRENCY } from '../../scripts/messages.js';
import {
  readRawCell, readRowText, alertOptions, safeHref, buildBlockHeader,
} from '../../scripts/block-utils.js';

// used when the document has no Endpoint row; [] or null (no data) → the empty message
// directly, without alert
const FALLBACK_PRODUCTS = [
  {
    id: 'P001',
    productId: 'PROD-001',
    sku: 'IPH-15-128-BLK',
    brand: 'Apple',
    name: 'iPhone 15',
    description: 'Smartphone Apple iPhone 15 de 128GB.',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80',
    price: 19999,
    oldPrice: 22999,
    promo: '13% OFF',
    currency: 'MXN',
    rating: 4.6,
    reviews: 2341,
    stock: 18,
    active: true,
    badge: 'Más vendido',
  },
  {
    id: 'P002',
    productId: 'PROD-002',
    sku: 'IPH-15-256-BLU',
    brand: 'Apple',
    name: 'iPhone 15',
    description: 'Smartphone Apple iPhone 15 de 256GB.',
    image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&q=80',
    price: 19999,
    oldPrice: 22999,
    promo: '13% OFF',
    currency: 'MXN',
    rating: 4.6,
    reviews: 2341,
    stock: 12,
    active: true,
    badge: 'Más vendido',
  },
  {
    id: 'P003',
    productId: 'PROD-003',
    sku: 'IPH-16-128-BLK',
    brand: 'Apple',
    name: 'iPhone 16',
    description: 'Smartphone Apple iPhone 16 de 128GB.',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80',
    price: 16999,
    oldPrice: 19999,
    promo: '10% OFF',
    currency: 'MXN',
    rating: 4.7,
    reviews: 890,
    stock: 10,
    active: true,
    badge: 'Nuevo',
  },
  {
    id: 'P004',
    productId: 'PROD-004',
    sku: 'IPH-16-256-WHT',
    brand: 'Apple',
    name: 'iPhone 16',
    description: 'Smartphone Apple iPhone 16 de 256GB.',
    image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&q=80',
    price: 18999,
    oldPrice: 21999,
    promo: '9% OFF',
    currency: 'MXN',
    rating: 4.7,
    reviews: 890,
    stock: 8,
    active: true,
    badge: 'Nuevo',
  },
];

// grey placeholder cards painted while the service answers
const SKELETON_ELEMENTS = 4;
// icon of the "no featured products" message, unless the table has an Empty List Icon row
const EMPTY_LIST_ICON = '📦';
// texts only read by screen readers (not authored)
const LABELS = {
  price: 'Precio',
  oldPrice: 'Precio anterior',
  rating: (rating, reviews) => `Calificación ${rating} de 5${reviews}`,
  reviews: (count) => `, ${count} reseñas`,
};
let headingCount = 0;

// service values → trimmed string ('' if not a string) / number (null if not numeric)
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const number = (value) => (value === null || value === '' || !Number.isFinite(Number(value))
  ? null : Number(value));

/**
 * Everything the block reads from its table, with the defaults applied.
 * @param {Element} block
 * @returns {{endpoint: string, linkTemplate: string, buttonText: string, alert: Object,
 *   messages: {errorResponseMessage: string, emptyListTitle: string,
 *     emptyListDescription: string, emptyListIcon: string, imageErrorMessage: string}}}
 */
function readSettings(block) {
  const cell = (key) => readRawCell(block, key).text;
  const endpointCell = readRawCell(block, 'endpoint');
  return {
    endpoint: endpointCell.href || endpointCell.text,
    linkTemplate: cell('product link'),
    buttonText: cell('button text'),
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
      imageErrorMessage: readRowText(block, 'image error message', MESSAGES.imageErrorMessage),
    },
  };
}

/**
 * Formats a price in LOCALE without decimals ($19,999); an unknown currency code falls
 * back to CURRENCY (both from scripts/messages.js).
 * @param {number} value
 * @param {string} currency ISO 4217 code, e.g. 'MXN'
 * @returns {string}
 */
function formatPrice(value, currency) {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(value);
  } catch {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency', currency: CURRENCY, maximumFractionDigits: 0,
    }).format(value);
  }
}

/**
 * Builds the product link from the item's own path/url or the authored template,
 * e.g. "/productos/{sku}" (placeholders: {sku}, {productId}, {id}).
 * @param {Object} item Raw product
 * @param {string} template Product Link row ('' when the table has none)
 * @returns {string|null} null without template or when a placeholder could not be filled
 */
function productHref(item, template) {
  const own = safeHref(item.path || item.url);
  if (own) return own;
  if (!template) return null;
  const filled = template.replace(/\{(sku|productId|id)\}/g, (match, key) => encodeURIComponent(String(item[key] ?? '').toLowerCase()));
  return /\{|\/\/?$/.test(filled) ? null : safeHref(filled);
}

/**
 * Active products with a name and a price, without duplicates (href null = no link).
 * Validates every field (URLs with safeHref, currency code, rating 0-5, oldPrice > price).
 * @param {Object[]} list Raw products (service or fallback)
 * @param {string} linkTemplate
 * @returns {Object[]}
 */
function normalize(list, linkTemplate) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && item.active !== false)
    .map((item) => {
      const price = number(item.price);
      const oldPrice = number(item.oldPrice);
      const rating = number(item.rating);
      const reviews = number(item.reviews);
      return {
        id: String(item.id ?? item.productId ?? item.sku ?? ''),
        brand: text(item.brand),
        name: text(item.name) || text(item.model),
        description: text(item.description),
        image: safeHref(item.image),
        price,
        oldPrice: oldPrice !== null && price !== null && oldPrice > price ? oldPrice : null,
        currency: /^[A-Z]{3}$/.test(text(item.currency)) ? text(item.currency) : CURRENCY,
        promo: text(item.promo),
        badge: text(item.badge),
        rating: rating === null ? null : Math.min(5, Math.max(0, rating)),
        reviews: reviews === null ? null : Math.max(0, Math.round(reviews)),
        href: productHref(item, linkTemplate),
      };
    })
    .filter((item) => {
      if (!item.name || item.price === null || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
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
 * Square image box with the badge ("Más vendido") and promo ("13% OFF") labels; a missing
 * or broken image shows Image Error Message (nothing when that row is empty).
 * @param {Object} product Normalised product
 * @param {string} imageErrorMessage
 * @returns {Element} div.card-featured-media
 */
function buildMedia(product, imageErrorMessage) {
  const media = el('div', 'card-featured-media');
  const fallback = () => {
    media.classList.add('is-missing');
    media.querySelector('.card-featured-image')?.remove();
    if (imageErrorMessage) {
      media.prepend(el('div', 'card-featured-media-fallback', imageErrorMessage));
    }
  };
  if (product.image) {
    const img = el('img', 'card-featured-image');
    img.src = product.image;
    img.alt = product.description || `${product.brand} ${product.name}`.trim();
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 400;
    img.height = 400;
    img.addEventListener('error', fallback, { once: true });
    media.append(img);
  } else {
    fallback();
  }
  if (product.badge) media.append(el('div', 'card-featured-badge', product.badge));
  if (product.promo) media.append(el('div', 'card-featured-promo', product.promo));
  return media;
}

/**
 * Stars filled to the rating through --card-featured-rating (CSS) + review count;
 * screen readers get a single "Calificación 4.6 de 5, 2,341 reseñas" label (role=img).
 * @param {Object} product Normalised product
 * @returns {Element|null} null when the product has no rating
 */
function buildRating(product) {
  if (product.rating === null) return null;
  const count = product.reviews === null ? '' : new Intl.NumberFormat(LOCALE).format(product.reviews);
  const rating = el('div', 'card-featured-rating');
  rating.setAttribute('role', 'img');
  rating.setAttribute('aria-label', LABELS.rating(product.rating, count && LABELS.reviews(count)));
  const stars = el('span', 'card-featured-stars', '★★★★★');
  stars.style.setProperty('--card-featured-rating', `${(product.rating / 5) * 100}%`);
  rating.append(stars);
  if (count) rating.append(el('span', 'card-featured-reviews', `(${count})`));
  return rating;
}

/**
 * Current price + crossed-out old price (only when higher, role=deletion), with hidden
 * labels for screen readers.
 * @param {Object} product Normalised product
 * @returns {Element} div.card-featured-prices
 */
function buildPrices(product) {
  const prices = el('div', 'card-featured-prices');
  const current = el('div', 'card-featured-price');
  current.append(el('span', 'card-featured-sr-only', `${LABELS.price}: `), formatPrice(product.price, product.currency));
  prices.append(current);
  if (product.oldPrice !== null) {
    const old = el('div', 'card-featured-old-price');
    old.setAttribute('role', 'deletion');
    old.append(el('span', 'card-featured-sr-only', `${LABELS.oldPrice}: `), formatPrice(product.oldPrice, product.currency));
    prices.append(old);
  }
  return prices;
}

/**
 * Product name (heading level 3). Without Button Text the name itself is the product link.
 * @param {Object} product Normalised product
 * @param {string} buttonText
 * @returns {Element} div.card-featured-name
 */
function buildName(product, buttonText) {
  const name = el('div', 'card-featured-name');
  name.setAttribute('role', 'heading');
  name.setAttribute('aria-level', '3');
  if (product.href && !buttonText) {
    const link = el('a', 'card-featured-name-link', product.name);
    link.href = product.href;
    name.append(link);
  } else {
    name.textContent = product.name;
  }
  return name;
}

/**
 * Button pinned to the bottom of the card, only when the table has Button Text and the
 * product has a link.
 * @param {Object} product Normalised product
 * @param {string} buttonText
 * @returns {Element|null} a.card-featured-button
 */
function buildLink(product, buttonText) {
  if (!product.href || !buttonText) return null;
  const link = el('a', 'card-featured-button', buttonText);
  link.href = product.href;
  link.setAttribute('aria-label', `${buttonText}: ${`${product.brand} ${product.name}`.trim()}`);
  return link;
}

/**
 * One product card; service data is only ever set as text or validated URLs.
 * The whole card opens the product through its only link (button or name).
 * @param {Object} product Normalised product
 * @param {Object} settings readSettings() result
 * @returns {Element} div.card-featured-item[role=listitem]
 */
function buildCard(product, settings) {
  const card = el('div', 'card-featured-item');
  card.setAttribute('role', 'listitem');
  const body = el('div', 'card-featured-body');
  if (product.brand) body.append(el('div', 'card-featured-brand', product.brand));
  body.append(buildName(product, settings.buttonText));
  const rating = buildRating(product);
  if (rating) body.append(rating);
  body.append(buildPrices(product));
  const link = buildLink(product, settings.buttonText);
  if (link) body.append(link);

  card.append(buildMedia(product, settings.messages.imageErrorMessage), body);
  return card;
}

/**
 * Grey placeholder cards shown while the service answers (avoids layout shift).
 * @returns {Element} div hidden from assistive technology
 */
function buildSkeleton() {
  const list = el('div', 'card-featured-list');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_ELEMENTS; i += 1) list.append(el('div', 'card-featured-skeleton'));
  return list;
}

/**
 * "No featured products" message: empty list or service error.
 * @param {Object} messages Empty List Title / Description (table or scripts/messages.js)
 *   and Empty List Icon (table or EMPTY_LIST_ICON)
 * @returns {Element} div[role=status]
 */
function buildEmpty(messages) {
  const empty = el('div', 'card-featured-empty');
  empty.setAttribute('role', 'status');
  // each part only when it has text (an authored empty row leaves it out)
  if (messages.emptyListIcon) {
    const icon = el('div', 'card-featured-empty-icon', messages.emptyListIcon);
    icon.setAttribute('aria-hidden', 'true');
    empty.append(icon);
  }
  if (messages.emptyListTitle) {
    empty.append(el('div', 'card-featured-empty-title', messages.emptyListTitle));
  }
  if (messages.emptyListDescription) {
    empty.append(el('div', 'card-featured-empty-text', messages.emptyListDescription));
  }
  return empty;
}

/**
 * Renders the header and the cards, or the empty message when there is nothing to show.
 * @param {Element} block
 * @param {Element|null} header Title / Link rows (buildBlockHeader)
 * @param {Object[]} products Normalised products
 * @param {Object} settings readSettings() result
 */
function render(block, header, products, settings) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!products.length) {
    block.replaceChildren(...content, buildEmpty(settings.messages));
    return;
  }
  const list = el('div', 'card-featured-list');
  list.setAttribute('role', 'list');
  // screen readers name the list with the visible title ("Productos destacados, lista")
  const heading = header?.querySelector('.card-featured-heading');
  if (heading) {
    headingCount += 1;
    heading.id = heading.id || `card-featured-heading-${headingCount}`;
    list.setAttribute('aria-labelledby', heading.id);
  }
  list.append(...products.map((product) => buildCard(product, settings)));
  block.replaceChildren(...content, list);
}

/**
 * Loads products from the service; on any error logs it, shows a floating alert and
 * the empty message.
 * @param {Element} block
 * @param {Element|null} header
 * @param {Object} settings readSettings() result
 */
async function loadFromService(block, header, settings) {
  try {
    const response = await get(settings.endpoint);
    const products = response?.data?.products;
    if (!Array.isArray(products)) {
      throw new Error('Unexpected response: data.products is not a list');
    }
    render(block, header, normalize(products, settings.linkTemplate), settings);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-featured] Could not load featured products from', settings.endpoint, error);
    showToast(settings.messages.errorResponseMessage, settings.alert);
    render(block, header, [], settings);
  }
}

/**
 * Card Featured: featured product cards fed by a service (Endpoint row) or the internal JSON.
 * The block name gives the main .card-featured class that scopes every style.
 * @param {Element} block The card-featured block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readSettings(block);
  const header = buildBlockHeader(block, 'card-featured', { asDiv: true, withLink: true });

  if (!settings.endpoint) {
    render(block, header, normalize(FALLBACK_PRODUCTS, settings.linkTemplate), settings);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildSkeleton()].filter(Boolean));
  loadFromService(block, header, settings);
}
