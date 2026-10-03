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
 *   - Empty List Title / Description / Icon and Image Error Message: row missing →
 *     default (scripts/messages.js, EMPTY_LIST_ICON below); row present but empty →
 *     not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 * Prices use formatPrice / formatNumber (LOCALE and CURRENCY of scripts/messages.js).
 * The list is named by the Title through aria-labelledby.
 * The loading skeleton always paints SKELETON_ELEMENTS placeholder cards (below).
 *
 * Flow (shared helpers in scripts/block-utils.js):
 *   decorate(block)
 *     ├─ applyBlockOptions(block)          scripts/block-options.js → Styles / Classname rows
 *     ├─ readSettings(block)               readServiceSettings() + Product Link, Button Text,
 *     │                                    Image Error Message
 *     ├─ buildBlockHeader(…, withLink)     div[role=heading] + "Ver todos"
 *     ├─ no endpoint → show(FALLBACK_PRODUCTS)
 *     └─ endpoint    → renderSkeleton() + loadServiceList('products') → show(list)
 *                       (not awaited: the page keeps loading; on error alert + [])
 *   show(list) → renderCards(normalize(list).map(buildCard))   none → empty message
 *     buildCard → buildMedia() · buildName() · buildRating() · buildPrices() · buildLink()
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
import applyBlockOptions from '../../scripts/block-options.js';
import MESSAGES from '../../scripts/messages.js';
import {
  readRawCell, readRowText, readServiceSettings, buildBlockHeader, renderSkeleton,
  renderCards, loadServiceList, activeItems, uniqueById, linkFromTemplate, safeHref, toText,
  toNumber, formatPrice, formatNumber, el,
} from '../../scripts/block-utils.js';

const PREFIX = 'card-featured';

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
// placeholders allowed in the Product Link row
const LINK_KEYS = ['sku', 'productId', 'id'];
// texts only read by screen readers (not authored)
const LABELS = {
  price: 'Precio',
  oldPrice: 'Precio anterior',
  rating: (rating, reviews) => `Calificación ${rating} de 5${reviews}`,
  reviews: (count) => `, ${count} reseñas`,
};

/**
 * Everything the block reads from its table: the rows shared by every service block plus
 * its own ones.
 * @param {Element} block
 * @returns {Object} readServiceSettings() + linkTemplate, buttonText and
 *   messages.imageErrorMessage
 */
function readSettings(block) {
  const settings = readServiceSettings(block, EMPTY_LIST_ICON);
  return {
    ...settings,
    linkTemplate: readRawCell(block, 'product link').text,
    buttonText: readRawCell(block, 'button text').text,
    messages: {
      ...settings.messages,
      imageErrorMessage: readRowText(block, 'image error message', MESSAGES.imageErrorMessage),
    },
  };
}

/**
 * Active products with a name and a price, without duplicates (href null = no link).
 * Validates every field (URLs with safeHref, currency code, rating 0-5, oldPrice > price).
 * @param {*} list Raw products (service or fallback); not a list gives []
 * @param {string} linkTemplate Product Link row
 * @returns {Object[]}
 */
function normalize(list, linkTemplate) {
  return uniqueById(activeItems(list)
    .map((item) => {
      const price = toNumber(item.price);
      const oldPrice = toNumber(item.oldPrice);
      const rating = toNumber(item.rating);
      const reviews = toNumber(item.reviews);
      return {
        id: String(item.id ?? item.productId ?? item.sku ?? ''),
        brand: toText(item.brand),
        name: toText(item.name) || toText(item.model),
        description: toText(item.description),
        image: safeHref(item.image),
        price,
        oldPrice: oldPrice !== null && price !== null && oldPrice > price ? oldPrice : null,
        // no valid code → undefined, so formatPrice uses CURRENCY (scripts/messages.js)
        currency: /^[A-Z]{3}$/.test(toText(item.currency)) ? toText(item.currency) : undefined,
        promo: toText(item.promo),
        badge: toText(item.badge),
        rating: rating === null ? null : Math.min(5, Math.max(0, rating)),
        reviews: reviews === null ? null : Math.max(0, Math.round(reviews)),
        href: linkFromTemplate(item, linkTemplate, LINK_KEYS),
      };
    })
    .filter((item) => item.name && item.price !== null));
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
  const count = product.reviews === null ? '' : formatNumber(product.reviews);
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
 * Card Featured: featured product cards fed by a service (Endpoint row) or the internal JSON.
 * The block name gives the main .card-featured class that scopes every style.
 * @param {Element} block The card-featured block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readSettings(block);
  const header = buildBlockHeader(block, PREFIX, { asDiv: true, withLink: true });
  const show = (list) => renderCards(
    block,
    PREFIX,
    header,
    normalize(list, settings.linkTemplate).map((product) => buildCard(product, settings)),
    settings.messages,
  );

  if (!settings.endpoint) {
    show(FALLBACK_PRODUCTS);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  renderSkeleton(block, PREFIX, header, SKELETON_ELEMENTS);
  loadServiceList(settings.endpoint, 'products', {
    source: PREFIX,
    errorMessage: settings.messages.errorResponseMessage,
    alert: settings.alert,
  }).then(show);
}
