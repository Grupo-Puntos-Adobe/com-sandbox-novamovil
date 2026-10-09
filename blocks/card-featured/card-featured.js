/*
 * Card Featured block: featured product cards from a service (Endpoint row) or the internal JSON.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Card Featured" table.
 *
 * Authored rows (all optional): Styles, Classname, Title, Link ("Ver todos"), Endpoint,
 * Product Link ("/celulares/?sku={sku}"), Button Text, Alert Duration, Alert Color,
 * Error Response Message, Empty List Title, Empty List Description, Empty List Icon,
 * Image Error Message.
 * Defaults only for messages and the alert:
 *   - Title, Link, Button Text and Product Link have no default: without text in the
 *     table that part is not painted. Without Button Text the product name is the link;
 *     without Product Link (and no path from the service) the card has no link.
 *   - Empty List Title / Description / Icon and Image Error Message (readRowTextOrDefault): row
 *     missing → default (scripts/foundations/messages.js, EMPTY_LIST_ICON below); row present but
 *     empty → not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 * Prices use formatPrice (scripts/foundations/block-utils.js) with LOCALE and CURRENCY from
 * scripts/foundations/messages.js.
 * The list is named by the Title (aria-label with the title text).
 * The loading skeleton always paints SKELETON_ELEMENTS placeholder cards (below).
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)        Styles / Classname rows (foundations/block-options.js)
 *     ├─ readFeaturedSettings(block)             endpoint, product link, alert, title, messages
 *     │    └─ readTableCell / readRowTextOrDefault / getAlertOptions (foundations/block-utils.js)
 *     ├─ buildProductsHeader(block)      title: buildSectionTitle() (foundations/block-utils.js)
 *     │                                  + "Ver todos": buildViewAllLink(), placed in the grid
 *     ├─ no endpoint → renderProducts(normalizeProducts(FALLBACK_PRODUCTS))
 *     └─ endpoint    → buildProductsSkeleton() + loadProductsFromService()
 *                       (not awaited: the page keeps loading)
 *                         ├─ get(endpoint)   scripts/api/http-client.js
 *                         ├─ ok    → renderProducts(normalizeProducts(data.products))
 *                         └─ error → console.error + showToast(errorResponseMessage)
 *                                    + renderProducts([])
 *   renderProducts(block, header, products, settings)
 *     ├─ none → buildEmptyListMessage() (blocks/empty-list-message, shared by the card blocks)
 *     └─ div.card-featured-list[role=list] > buildProductCard() per product
 *          └─ buildProductMedia() · buildProductName() · buildProductRating()
 *             · buildProductPrices() (formatPrice) · buildProductButton()
 *
 * Columns come from the grid (styles/foundations/grid.css), not from card-featured.css. The grid
 * is always container > row > col, and it is used in every part with columns:
 *   - header: div.card-featured-header-grid.container-fluid > row (row-middle row-gutter-16) >
 *     col (title, fills the space) + col-auto ("Ver todos", as wide as its text)
 *   - prices: div.card-featured-prices.container-fluid > row (row-gutter-8) > col-auto (price)
 *     + col-auto (old price)
 *   - list: div.card-featured-grid.container-fluid (no side padding: the
 * section already has it) > the list (and the skeleton) as a row (row row-gutter-16
 * row-gutter-y-16) > each product cell a
 * column (col-24 col-md-12 col-lg-6: 1 per row on mobile, 2 on tablet, 4 on desktop).
 *
 * Markup is all divs except the product image (<img>) and the links (<a>). Classes used by
 * card-featured.css: card-featured-header, -heading, -link, -item, -media, -image,
 * -media-fallback, -badge, -promo, -body, -brand, -name, -name-link, -rating, -stars,
 * -reviews, -prices, -prices-row, -price, -old-price, -button, -sr-only, -skeleton.
 * card-featured-grid, -list, -cell, -header-grid, -header-row, -header-title and -header-action
 * only name the grid levels (container, row, col). The empty message (div.empty-list-message)
 * comes from blocks/empty-list-message.
 *
 * Expected response: { data: { products: [{ id, sku, brand, name, description, image, price,
 *   oldPrice, promo, currency, rating, reviews, badge, active, path? }] } }
 * Guides: blocks/card-featured/README.md, documentation/02-integracion-endpoints.md
 */
import { readBlockConfig } from '../../scripts/aem.js';
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/foundations/toast.js';
import MESSAGES, { LOCALE, CURRENCY } from '../../scripts/foundations/messages.js';
import {
  readTableCell, readRowTextOrDefault, getAlertOptions, getSafeHref, buildSectionTitle, formatPrice,
} from '../../scripts/foundations/block-utils.js';
import { buildEmptyListMessage } from '../empty-list-message/empty-list-message.js';

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

// service values → trimmed string ('' if not a string) / number (null if not numeric)
const toTrimmedText = (value) => (typeof value === 'string' ? value.trim() : '');
const toNumberOrNull = (value) => (value === null || value === '' || !Number.isFinite(Number(value))
  ? null : Number(value));

/**
 * Everything the block reads from its table, with the defaults applied.
 * @param {Element} block
 * @returns {{endpoint: string, linkTemplate: string, buttonText: string, alert: Object,
 *   messages: {errorResponseMessage: string, emptyListTitle: string,
 *     emptyListDescription: string, emptyListIcon: string, imageErrorMessage: string}}}
 */
function readFeaturedSettings(block) {
  const readCellText = (key) => readTableCell(block, key).text;
  const endpointCell = readTableCell(block, 'endpoint');
  return {
    endpoint: endpointCell.href || endpointCell.text,
    linkTemplate: readCellText('product link'),
    buttonText: readCellText('button text'),
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
      imageErrorMessage: readRowTextOrDefault(block, 'image error message', MESSAGES.imageErrorMessage),
    },
  };
}

/**
 * Builds the product link from the item's own path/url or the authored template,
 * e.g. "/celulares/?sku={sku}" (placeholders: {sku}, {productId}, {id}).
 * @param {Object} item Raw product
 * @param {string} linkTemplate Product Link row ('' when the table has none)
 * @returns {string|null} null without template or when a placeholder could not be filled
 */
function buildProductHref(item, linkTemplate) {
  const own = getSafeHref(item.path || item.url);
  if (own) return own;
  if (!linkTemplate) return null;
  const filled = linkTemplate.replace(/\{(sku|productId|id)\}/g, (placeholder, key) => encodeURIComponent(String(item[key] ?? '').toLowerCase()));
  return /\{|\/\/?$/.test(filled) ? null : getSafeHref(filled);
}

/**
 * Active products with a name and a price, without duplicates (href null = no link).
 * Validates every field (URLs with getSafeHref, currency code, rating 0-5, oldPrice > price).
 * @param {Object[]} rawProducts Products as they come (service or fallback)
 * @param {string} linkTemplate Product Link row
 * @returns {Object[]} the normalised products
 */
function normalizeProducts(rawProducts, linkTemplate) {
  const seen = new Set();
  return (Array.isArray(rawProducts) ? rawProducts : [])
    .filter((item) => item && item.active !== false)
    .map((item) => {
      const price = toNumberOrNull(item.price);
      const oldPrice = toNumberOrNull(item.oldPrice);
      const rating = toNumberOrNull(item.rating);
      const reviews = toNumberOrNull(item.reviews);
      return {
        id: String(item.id ?? item.productId ?? item.sku ?? ''),
        brand: toTrimmedText(item.brand),
        name: toTrimmedText(item.name) || toTrimmedText(item.model),
        description: toTrimmedText(item.description),
        image: getSafeHref(item.image),
        price,
        oldPrice: oldPrice !== null && price !== null && oldPrice > price ? oldPrice : null,
        currency: /^[A-Z]{3}$/.test(toTrimmedText(item.currency)) ? toTrimmedText(item.currency) : CURRENCY,
        promo: toTrimmedText(item.promo),
        badge: toTrimmedText(item.badge),
        rating: rating === null ? null : Math.min(5, Math.max(0, rating)),
        reviews: reviews === null ? null : Math.max(0, Math.round(reviews)),
        href: buildProductHref(item, linkTemplate),
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
function createElementWithClass(tag, className, content) {
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
function buildProductMedia(product, imageErrorMessage) {
  const media = createElementWithClass('div', 'card-featured-media');
  const fallback = () => {
    media.classList.add('is-missing');
    media.querySelector('.card-featured-image')?.remove();
    if (imageErrorMessage) {
      media.prepend(createElementWithClass('div', 'card-featured-media-fallback', imageErrorMessage));
    }
  };
  if (product.image) {
    const img = createElementWithClass('img', 'card-featured-image');
    img.src = product.image;
    img.alt = product.description || `${product.brand} ${product.name}`.trim();
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', fallback, { once: true });
    media.append(img);
  } else {
    fallback();
  }
  if (product.badge) media.append(createElementWithClass('div', 'card-featured-badge', product.badge));
  if (product.promo) media.append(createElementWithClass('div', 'card-featured-promo', product.promo));
  return media;
}

/**
 * Stars filled to the rating through --card-featured-rating (CSS) + review count;
 * screen readers get a single "Calificación 4.6 de 5, 2,341 reseñas" label (role=img).
 * @param {Object} product Normalised product
 * @returns {Element|null} null when the product has no rating
 */
function buildProductRating(product) {
  if (product.rating === null) return null;
  const count = product.reviews === null ? '' : new Intl.NumberFormat(LOCALE).format(product.reviews);
  const rating = createElementWithClass('div', 'card-featured-rating');
  rating.setAttribute('role', 'img');
  rating.setAttribute('aria-label', LABELS.rating(product.rating, count && LABELS.reviews(count)));
  const stars = createElementWithClass('span', 'card-featured-stars', '★★★★★');
  // only the value (0-5); card-featured.css turns it into the fill
  stars.style.setProperty('--card-featured-rating', String(product.rating));
  rating.append(stars);
  if (count) rating.append(createElementWithClass('span', 'card-featured-reviews', `(${count})`));
  return rating;
}

/**
 * Current price + crossed-out old price (only when higher, role=deletion), with hidden
 * labels for screen readers; each one is a grid column as wide as its text.
 * @param {Object} product Normalised product
 * @returns {Element} div.card-featured-prices.container-fluid > row > col-auto (× 1 or 2)
 */
function buildProductPrices(product) {
  const prices = createElementWithClass('div', 'card-featured-prices container-fluid');
  const row = createElementWithClass('div', 'card-featured-prices-row row row-gutter-8');
  const current = createElementWithClass('div', 'card-featured-price col-auto');
  current.append(createElementWithClass('span', 'card-featured-sr-only', `${LABELS.price}: `), formatPrice(product.price, product.currency));
  row.append(current);
  if (product.oldPrice !== null) {
    const old = createElementWithClass('div', 'card-featured-old-price col-auto');
    old.setAttribute('role', 'deletion');
    old.append(createElementWithClass('span', 'card-featured-sr-only', `${LABELS.oldPrice}: `), formatPrice(product.oldPrice, product.currency));
    row.append(old);
  }
  prices.append(row);
  return prices;
}

/**
 * Product name (heading level 3). Without Button Text the name itself is the product link.
 * @param {Object} product Normalised product
 * @param {string} buttonText
 * @returns {Element} div.card-featured-name
 */
function buildProductName(product, buttonText) {
  const name = createElementWithClass('div', 'card-featured-name');
  name.setAttribute('role', 'heading');
  name.setAttribute('aria-level', '3');
  if (product.href && !buttonText) {
    const link = createElementWithClass('a', 'card-featured-name-link', product.name);
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
function buildProductButton(product, buttonText) {
  if (!product.href || !buttonText) return null;
  const link = createElementWithClass('a', 'card-featured-button', buttonText);
  link.href = product.href;
  link.setAttribute('aria-label', `${buttonText}: ${`${product.brand} ${product.name}`.trim()}`);
  return link;
}

/**
 * One product card inside its grid column; service data is only ever set as text or
 * validated URLs. The whole card opens the product through its only link (button or name).
 * @param {Object} product Normalised product
 * @param {Object} settings readFeaturedSettings() result
 * @returns {Element} div.card-featured-cell[role=listitem] > div.card-featured-item
 */
function buildProductCard(product, settings) {
  const cell = createElementWithClass('div', 'card-featured-cell col-24 col-md-12 col-lg-6');
  cell.setAttribute('role', 'listitem');
  const card = createElementWithClass('div', 'card-featured-item');
  const body = createElementWithClass('div', 'card-featured-body');
  if (product.brand) body.append(createElementWithClass('div', 'card-featured-brand', product.brand));
  body.append(buildProductName(product, settings.buttonText));
  const rating = buildProductRating(product);
  if (rating) body.append(rating);
  body.append(buildProductPrices(product));
  const link = buildProductButton(product, settings.buttonText);
  if (link) body.append(link);

  card.append(buildProductMedia(product, settings.messages.imageErrorMessage), body);
  cell.append(card);
  return cell;
}

/**
 * Grey placeholder cards shown while the service answers (avoids layout shift); same grid
 * columns as the real cards.
 * @returns {Element} div.card-featured-grid.container-fluid > row, hidden from screen readers
 */
function buildProductsSkeleton() {
  const list = createElementWithClass('div', 'card-featured-list row row-gutter-16 row-gutter-y-16');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_ELEMENTS; i += 1) {
    const cell = createElementWithClass('div', 'card-featured-cell col-24 col-md-12 col-lg-6');
    cell.append(createElementWithClass('div', 'card-featured-skeleton'));
    list.append(cell);
  }
  const grid = createElementWithClass('div', 'card-featured-grid container-fluid');
  grid.append(list);
  return grid;
}

/**
 * Renders the header and the cards, or the empty message when there is nothing to show.
 * @param {Element} block
 * @param {Element|null} header Title / Link rows (buildProductsHeader)
 * @param {Object[]} products Normalised products
 * @param {Object} settings readFeaturedSettings() result
 */
function renderProducts(block, header, products, settings) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!products.length) {
    block.replaceChildren(...content, buildEmptyListMessage({
      icon: settings.messages.emptyListIcon,
      title: settings.messages.emptyListTitle,
      description: settings.messages.emptyListDescription,
    }));
    return;
  }
  const list = createElementWithClass('div', 'card-featured-list row row-gutter-16 row-gutter-y-16');
  list.setAttribute('role', 'list');
  // screen readers name the list with the visible title ("Productos destacados, lista")
  const heading = header?.querySelector('.card-featured-heading');
  if (heading) list.setAttribute('aria-label', heading.textContent);
  list.append(...products.map((product) => buildProductCard(product, settings)));
  const grid = createElementWithClass('div', 'card-featured-grid container-fluid');
  grid.append(list);
  block.replaceChildren(...content, grid);
}

/**
 * Loads products from the service; on any error logs it, shows a floating alert and
 * the empty message.
 * @param {Element} block
 * @param {Element|null} header
 * @param {Object} settings readFeaturedSettings() result
 */
async function loadProductsFromService(block, header, settings) {
  try {
    const response = await get(settings.endpoint);
    const rawProducts = response?.data?.products;
    if (!Array.isArray(rawProducts)) {
      throw new Error('Unexpected response: data.products is not a list');
    }
    const products = normalizeProducts(rawProducts, settings.linkTemplate);
    renderProducts(block, header, products, settings);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-featured] Could not load featured products from', settings.endpoint, error);
    showToast(settings.messages.errorResponseMessage, settings.alert);
    renderProducts(block, header, [], settings);
  }
}

/**
 * "Ver todos" button from the Link row (text and link of the cell). No default: without a
 * Link row with a valid link there is no button.
 * @param {Element} block
 * @returns {Element|null} a.card-featured-link
 */
function buildViewAllLink(block) {
  const cell = readTableCell(block, 'link');
  const href = cell.text ? getSafeHref(cell.href) : null;
  if (!href) return null;
  const link = createElementWithClass('a', 'card-featured-link', cell.text);
  link.href = href;
  return link;
}

/**
 * Section header: the title (buildSectionTitle, Title row) and "Ver todos" (Link row), laid
 * out with the grid: the title fills the row and the button is as wide as its text; without
 * a title the button stays on the right (row-end).
 * @param {Element} block
 * @returns {Element|null} div.card-featured-header > div.card-featured-header-grid.container-fluid
 *   > row > col (title) + col-auto (link); null when there is no title nor link
 */
function buildProductsHeader(block) {
  const heading = buildSectionTitle(block, 'card-featured')?.querySelector('.card-featured-heading');
  const link = buildViewAllLink(block);
  if (!heading && !link) return null;
  const header = createElementWithClass('div', 'card-featured-header');
  const row = createElementWithClass('div', `card-featured-header-row row row-middle row-gutter-16${heading ? '' : ' row-end'}`);
  if (heading) {
    const titleColumn = createElementWithClass('div', 'card-featured-header-title col');
    titleColumn.append(heading);
    row.append(titleColumn);
  }
  if (link) {
    const linkColumn = createElementWithClass('div', 'card-featured-header-action col-auto');
    linkColumn.append(link);
    row.append(linkColumn);
  }
  const grid = createElementWithClass('div', 'card-featured-header-grid container-fluid');
  grid.append(row);
  header.replaceChildren(grid);
  return header;
}

/**
 * Card Featured: featured product cards fed by a service (Endpoint row) or the internal JSON.
 * The block name gives the main .card-featured class that scopes every style.
 * @param {Element} block The card-featured block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readFeaturedSettings(block);
  const header = buildProductsHeader(block);

  if (!settings.endpoint) {
    const products = normalizeProducts(FALLBACK_PRODUCTS, settings.linkTemplate);
    renderProducts(block, header, products, settings);
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildProductsSkeleton()].filter(Boolean));
  loadProductsFromService(block, header, settings);
}
