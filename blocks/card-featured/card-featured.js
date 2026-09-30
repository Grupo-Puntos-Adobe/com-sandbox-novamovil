import { readBlockConfig } from '../../scripts/aem.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import {
  readRawCell, alertOptions, safeHref, observeBalancedColumns,
} from '../../scripts/block-utils.js';

// used when the document has no Endpoint row
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

const SKELETON_COUNT = 4;
// keep in sync with card-featured.css (card width, gap and breakpoint)
const CARD_MIN_WIDTH = 220;
const CARD_GAP = 20;
const MAX_COLUMNS = 4; // the design shows four products per row on desktop
const multiColumn = window.matchMedia('(width >= 600px)');
const DEFAULT_PRODUCT_LINK = '/productos/{sku}';
const DEFAULT_CURRENCY = 'MXN';
const LOCALE = 'es-MX';
const MESSAGES = {
  error: 'No pudimos cargar los productos destacados. Intenta de nuevo más tarde.',
  emptyTitle: 'Por ahora no hay productos destacados',
  emptyText: 'Vuelve pronto para descubrir nuestras ofertas.',
  button: 'Ver producto',
  oldPrice: 'Precio anterior',
  price: 'Precio',
  imageFallback: 'Imagen no disponible',
};

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const number = (value) => (value === null || value === '' || !Number.isFinite(Number(value))
  ? null : Number(value));

function formatPrice(value, currency) {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(value);
  } catch {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0,
    }).format(value);
  }
}

/**
 * Builds the product link from the item's own path/url or the authored template,
 * e.g. "/productos/{sku}" (placeholders: {sku}, {productId}, {id}).
 */
function productHref(item, template) {
  const own = safeHref(item.path || item.url);
  if (own) return own;
  const filled = template.replace(/\{(sku|productId|id)\}/g, (match, key) => encodeURIComponent(String(item[key] ?? '').toLowerCase()));
  return /\{|\/\/?$/.test(filled) ? null : safeHref(filled);
}

/**
 * Active products with a name, a price and a valid link, without duplicates.
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
        currency: /^[A-Z]{3}$/.test(text(item.currency)) ? text(item.currency) : DEFAULT_CURRENCY,
        promo: text(item.promo),
        badge: text(item.badge),
        rating: rating === null ? null : Math.min(5, Math.max(0, rating)),
        reviews: reviews === null ? null : Math.max(0, Math.round(reviews)),
        href: productHref(item, linkTemplate),
      };
    })
    .filter((item) => {
      if (!item.name || item.price === null || !item.href || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function buildMedia(product) {
  const media = el('div', 'card-featured-media');
  const fallback = () => {
    media.classList.add('is-missing');
    media.replaceChildren(el('span', 'card-featured-media-fallback', MESSAGES.imageFallback));
  };
  if (product.image) {
    const img = el('img');
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
  if (product.badge) media.append(el('span', 'card-featured-badge', product.badge));
  if (product.promo) media.append(el('span', 'card-featured-promo', product.promo));
  return media;
}

function buildRating(product) {
  if (product.rating === null) return null;
  const rating = el('p', 'card-featured-rating');
  const reviews = product.reviews === null ? '' : `, ${new Intl.NumberFormat(LOCALE).format(product.reviews)} reseñas`;
  rating.setAttribute('aria-label', `Calificación ${product.rating} de 5${reviews}`);
  const stars = el('span', 'card-featured-stars', '★★★★★');
  stars.style.setProperty('--card-featured-rating', `${(product.rating / 5) * 100}%`);
  stars.setAttribute('aria-hidden', 'true');
  rating.append(stars);
  if (product.reviews !== null) {
    const count = el('span', 'card-featured-reviews', `(${new Intl.NumberFormat(LOCALE).format(product.reviews)})`);
    count.setAttribute('aria-hidden', 'true');
    rating.append(count);
  }
  return rating;
}

function buildPrices(product) {
  const prices = el('p', 'card-featured-prices');
  const current = el('span', 'card-featured-price');
  current.append(el('span', 'card-featured-sr-only', `${MESSAGES.price}: `), formatPrice(product.price, product.currency));
  prices.append(current);
  if (product.oldPrice !== null) {
    const old = el('del', 'card-featured-old-price');
    old.append(el('span', 'card-featured-sr-only', `${MESSAGES.oldPrice}: `), formatPrice(product.oldPrice, product.currency));
    prices.append(old);
  }
  return prices;
}

/**
 * One product card; service data is only ever set as text or validated URLs.
 * The whole card is clickable through the "Ver producto" link.
 */
function buildCard(product) {
  const li = el('li', 'card-featured-item');
  const body = el('div', 'card-featured-body');
  if (product.brand) body.append(el('p', 'card-featured-brand', product.brand));
  body.append(el('h3', 'card-featured-name', product.name));
  const rating = buildRating(product);
  if (rating) body.append(rating);
  body.append(buildPrices(product));

  const link = el('a', 'card-featured-button', MESSAGES.button);
  link.href = product.href;
  link.setAttribute('aria-label', `${MESSAGES.button}: ${`${product.brand} ${product.name}`.trim()}`);
  body.append(link);

  li.append(buildMedia(product), body);
  return li;
}

function buildHeader(title, link) {
  if (!title && !link.text) return null;
  const header = el('div', 'card-featured-header');
  if (title) header.append(el('h2', 'card-featured-title', title));
  const href = safeHref(link.href);
  if (link.text && href) {
    const cta = el('a', 'card-featured-link', link.text);
    cta.href = href;
    header.append(cta);
  }
  return header;
}

function buildSkeleton() {
  const list = el('ul', 'card-featured-list');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_COUNT; i += 1) list.append(el('li', 'card-featured-skeleton'));
  return list;
}

function buildEmpty() {
  const empty = el('div', 'card-featured-empty');
  empty.setAttribute('role', 'status');
  const icon = el('span', 'card-featured-empty-icon', '📦');
  icon.setAttribute('aria-hidden', 'true');
  empty.append(
    icon,
    el('p', 'card-featured-empty-title', MESSAGES.emptyTitle),
    el('p', 'card-featured-empty-text', MESSAGES.emptyText),
  );
  return empty;
}

/**
 * Renders the header and the cards (or the empty message).
 */
function render(block, header, products) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!products.length) {
    block.replaceChildren(...content, buildEmpty());
    return;
  }
  const list = el('ul', 'card-featured-list');
  if (header?.querySelector('h2')) list.setAttribute('aria-label', header.querySelector('h2').textContent);
  list.append(...products.map(buildCard));
  block.replaceChildren(...content, list);
  // up to four equal cards per row filling the width; rows are balanced (4 → 2 + 2, never 3 + 1)
  observeBalancedColumns(list, {
    minWidth: CARD_MIN_WIDTH,
    gap: CARD_GAP,
    query: multiColumn,
    fillSingleRow: true,
    maxColumns: MAX_COLUMNS,
  });
}

/**
 * Loads products from the service; on any error logs it, shows a floating alert and
 * the empty message.
 */
async function loadFromService(block, header, endpoint, linkTemplate, alert) {
  try {
    const response = await get(endpoint);
    const products = response?.data?.products;
    if (!Array.isArray(products)) throw new Error('Unexpected response: data.products is not a list');
    render(block, header, normalize(products, linkTemplate));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[card-featured] Could not load featured products from', endpoint, error);
    showToast(MESSAGES.error, alert);
    render(block, header, []);
  }
}

/**
 * Card Featured: featured product cards fed by a service (Endpoint row) or the internal JSON.
 * The block name gives the main .card-featured class that scopes every style.
 * Rows: Title, Link ("Ver todos"), Endpoint, Product Link ("/productos/{sku}"),
 * Alert Duration (seconds), Alert Color. All optional.
 * @param {Element} block The card-featured block element
 */
export default function decorate(block) {
  const config = readBlockConfig(block);
  const endpointCell = readRawCell(block, 'endpoint');
  const endpoint = endpointCell.href || endpointCell.text;
  const linkTemplate = readRawCell(block, 'product link').text || DEFAULT_PRODUCT_LINK;
  const header = buildHeader(readRawCell(block, 'title').text, readRawCell(block, 'link'));
  const alert = alertOptions(config);

  if (!endpoint) {
    render(block, header, normalize(FALLBACK_PRODUCTS, linkTemplate));
    return;
  }

  // skeleton keeps the layout stable; the request does not block the following sections
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildSkeleton()].filter(Boolean));
  loadFromService(block, header, endpoint, linkTemplate, alert);
}
