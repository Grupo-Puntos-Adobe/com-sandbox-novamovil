/*
 * Product Detail block: the page of one phone (/celulares/?sku=iph-15-128-blk), fed
 * only by a POST service (Endpoint row). There is no internal JSON: without Endpoint, or when
 * the service fails or has no product, the block shows the "not available" message.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Product Detail" table.
 *
 * Authored rows (all optional): Styles, Classname, Endpoint, Catalog Link, Back Text,
 * Color Label, Storage Label, Quantity Label, Reviews Text ("({count} reseñas)"),
 * Savings Text ("Ahorras {amount}"), Installments Text ("O {months} MSI de {amount}/mes sin
 * intereses"), Installments Months, In Stock Text, Sold Out Text, Button Text, Benefit N
 * (icon | text), Specs Title, Alert Duration, Alert Color, Error Response Message,
 * Empty List Title, Empty List Description, Empty List Icon, Image Error Message.
 * Defaults only for messages and configuration:
 *   - Content (labels, texts, button, benefits, Specs Title) has no default: without text in
 *     the table that part is not painted.
 *   - Empty List Title / Description / Icon and Image Error Message (readRowTextOrDefault):
 *     row missing → default (scripts/foundations/messages.js, EMPTY_LIST_ICON below);
 *     row present but empty → not painted.
 *   - Error Response Message, Alert Duration, Alert Color: missing or empty → default.
 *   - Catalog Link: missing → the folder of the page (/celulares for /celulares/).
 *
 * The block lives in the index document of the celulares folder (celulares/index, URL
 * /celulares/) and the phone comes from the URL parameter: /celulares/?sku=iph-15-128-blk (see
 * readSkuFromUrl). Without sku the page goes back to Catalog Link (/celulares, with
 * location.replace so "back" does not return to the empty page).
 * Detail request: only data.productId changes; meta and security are fixed
 * (DETAIL_REQUEST_META, DETAIL_REQUEST_SECURITY), as the service expects.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)          Styles / Classname rows
 *     ├─ readDetailSettings(block)         texts, endpoint, alert, messages, benefits
 *     ├─ readSkuFromUrl()                  none → location.replace(catalogLink)
 *     ├─ buildDetailSkeleton()
 *     └─ loadProductFromService()          post(Endpoint, { meta, security, data: { productId } })
 *          ├─ ok    → normalizeProduct() → renderProductDetail()
 *          │            ├─ buildProductGallery() · buildProductSummary() · buildPurchaseOptions()
 *          │            ├─ buildBenefits() · buildSpecs()
 *          │            └─ setCurrentPageName() (breadcrumb "{product}") + document.title
 *          ├─ no product → renderNotAvailable()
 *          └─ error → console.error + showToast(errorResponseMessage) + renderNotAvailable()
 *
 * "Agregar al carrito" is painted but does nothing yet: it will open the cart screen (cart
 * service /api/v1/cart/items), still to be built. Favourites only toggle aria-pressed.
 *
 * No resolution logic here: product-detail.css decides each resolution. Columns come from the
 * grid (styles/foundations/grid.css):
 *   layout     container-fluid > row row-gutter-48 row-gutter-y-24 > col-24 col-md-12 ×2
 *   thumbnails container-fluid > row row-gutter-8 > col-8 per image
 *   actions    container-fluid > row row-gutter-8 > col (cart button) + col-auto (favourite)
 *   specs      container-fluid[role=table] > row row-gutter-16[role=row] > col-9 col-md-6
 *              col-lg-4 (label) + col-15 col-md-18 col-lg-20 (value)
 *
 * Markup is all divs except the links (<a>), images (<img>) and buttons (<button>).
 * Expected response: { data: { id, sku?, brand, model|name, price, salePrice?, oldPrice,
 *   promo, badge, image|images[], colors[hex | {name, hex}], storage|storages[], ram,
 *   rating, reviews, available, stock?, specs[{ label, value }] } }
 * Guide: blocks/product-detail/README.md
 */
import { getMetadata, readBlockConfig } from '../../scripts/aem.js';
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { post } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/foundations/toast.js';
import MESSAGES, { CURRENCY, LOCALE } from '../../scripts/foundations/messages.js';
import {
  readTableCell, readRowTextOrDefault, getAlertOptions, getSafeHref, formatPrice,
} from '../../scripts/foundations/block-utils.js';
import { setCurrentPageName } from '../../scripts/foundations/page-context.js';
import { buildEmptyListMessage } from '../empty-list-message/empty-list-message.js';

// fixed parts of the detail request (only data.productId changes)
const DETAIL_REQUEST_META = {
  requestId: 'REQ-DET-001',
  correlationId: 'CORR-001',
  timestamp: '2026-09-17T16:00:00Z',
  channel: 'WEB',
  platform: 'DESKTOP',
};
const DETAIL_REQUEST_SECURITY = {
  auth: { type: 'Bearer', value: 'Bearer {{bearer_token}}' },
  nonce: 'NONCE-REQ-DET-001',
  signature: '{{hmac_signature}}',
};

// URL parameter with the phone identifier (the sku in lower case)
const SKU_PARAM = 'sku';
// quantity limit when the service does not send the stock
const MAX_QUANTITY = 10;
// icon of the "not available" message, unless the table has an Empty List Icon row
const EMPTY_LIST_ICON = '📱';
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
// texts only read by screen readers (not authored)
const LABELS = {
  image: (number, total) => `Imagen ${number} de ${total}`,
  color: (number) => `Color ${number}`,
  rating: (rating, reviews) => `Calificación ${rating} de 5${reviews ? `, ${reviews} reseñas` : ''}`,
  oldPrice: 'Precio anterior',
  decrease: 'Disminuir cantidad',
  increase: 'Aumentar cantidad',
  favorite: 'Agregar a favoritos',
};

// service values → trimmed string ('' if not a string) / number (null if not numeric)
const toTrimmedText = (value) => (typeof value === 'string' ? value.trim() : '');
const toNumberOrNull = (value) => (value === null || value === '' || !Number.isFinite(Number(value))
  ? null : Number(value));
const formatCount = (value) => new Intl.NumberFormat(LOCALE).format(value);

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
 * "Benefit N" rows (icon | text), sorted by N.
 * @param {Element} block
 * @returns {{icon: string, text: string}[]}
 */
function readBenefitRows(block) {
  return [...block.querySelectorAll(':scope > div')]
    .map((row) => {
      const [keyCell, ...cells] = row.children;
      const number = Number(keyCell?.textContent.trim().toLowerCase().match(/^benefit ?(\d+)$/)?.[1]);
      const texts = cells.map((cell) => cell.textContent.trim()).filter(Boolean);
      const [icon, text] = texts.length > 1 ? texts : ['', texts[0] || ''];
      return { number, icon, text };
    })
    .filter((benefit) => Number.isFinite(benefit.number) && benefit.text)
    .sort((first, second) => first.number - second.number)
    .map(({ icon, text }) => ({ icon, text }));
}

/**
 * Everything the block reads from its table, with the defaults applied.
 * @param {Element} block
 * @returns {Object} texts, endpoint, catalogLink, installmentsMonths, benefits, alert, messages
 */
function readDetailSettings(block) {
  const readCellText = (key) => readTableCell(block, key).text;
  const endpointCell = readTableCell(block, 'endpoint');
  const catalogCell = readTableCell(block, 'catalog link');
  const months = Number.parseInt(readCellText('installments months'), 10);
  // the folder of the page: /celulares/ → /celulares
  const pageFolder = window.location.pathname.replace(/\/[^/]*$/, '') || '/';
  return {
    texts: {
      back: readCellText('back text'),
      colorLabel: readCellText('color label'),
      storageLabel: readCellText('storage label'),
      quantityLabel: readCellText('quantity label'),
      reviews: readCellText('reviews text'),
      savings: readCellText('savings text'),
      installments: readCellText('installments text'),
      inStock: readCellText('in stock text'),
      soldOut: readCellText('sold out text'),
      button: readCellText('button text'),
      specsTitle: readCellText('specs title'),
    },
    endpoint: endpointCell.href || endpointCell.text,
    catalogLink: getSafeHref(catalogCell.href || catalogCell.text) || pageFolder,
    installmentsMonths: Number.isFinite(months) && months > 0 ? months : null,
    benefits: readBenefitRows(block),
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
 * The phone identifier of the page: /celulares/?sku=iph-15-128-blk.
 * @returns {string} '' when the URL has none
 */
function readSkuFromUrl() {
  return (new URLSearchParams(window.location.search).get(SKU_PARAM) || '').trim().toLowerCase();
}

/**
 * The product as the page needs it, validated (URLs, prices, hex colours, stock).
 * Accepts the fields of today's service and the richer ones a real service may send
 * (images[], storages[], colours with name, stock, salePrice).
 * @param {Object} rawProduct data of the detail response
 * @returns {Object|null} null when there is no product (no name or no price)
 */
function normalizeProduct(rawProduct) {
  if (!rawProduct || typeof rawProduct !== 'object') return null;
  const brand = toTrimmedText(rawProduct.brand);
  const name = toTrimmedText(rawProduct.model) || toTrimmedText(rawProduct.name);
  const price = toNumberOrNull(rawProduct.salePrice) ?? toNumberOrNull(rawProduct.price);
  if (!name || price === null) return null;
  const oldPrice = toNumberOrNull(rawProduct.oldPrice);
  const stock = toNumberOrNull(rawProduct.stock);
  const rawImages = Array.isArray(rawProduct.images) && rawProduct.images.length
    ? rawProduct.images : [rawProduct.image || rawProduct.imageUrl];
  const rawStorages = Array.isArray(rawProduct.storages) && rawProduct.storages.length
    ? rawProduct.storages : [rawProduct.storage];
  const rating = toNumberOrNull(rawProduct.rating);
  const reviews = toNumberOrNull(rawProduct.reviews);
  return {
    brand,
    name,
    // "Apple iPhone 15 Pro" (without repeating the brand when the name has it)
    fullName: name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`.trim(),
    badge: toTrimmedText(rawProduct.badge),
    promo: toTrimmedText(rawProduct.promo),
    images: rawImages.map(getSafeHref).filter(Boolean),
    price,
    oldPrice: oldPrice !== null && oldPrice > price ? oldPrice : null,
    currency: /^[A-Z]{3}$/.test(toTrimmedText(rawProduct.currency))
      ? toTrimmedText(rawProduct.currency) : CURRENCY,
    rating: rating === null ? null : Math.min(5, Math.max(0, rating)),
    reviews: reviews === null ? null : Math.max(0, Math.round(reviews)),
    colors: (Array.isArray(rawProduct.colors) ? rawProduct.colors : [])
      .map((color) => (typeof color === 'string'
        ? { hex: color.trim(), name: '' }
        : { hex: toTrimmedText(color?.hex), name: toTrimmedText(color?.name) }))
      .filter((color) => HEX_COLOR.test(color.hex)),
    storages: rawStorages
      .map((storage) => toTrimmedText(storage?.label ?? storage))
      .filter(Boolean),
    isAvailable: rawProduct.available !== false && (stock === null || stock > 0),
    maxQuantity: stock !== null && stock > 0 ? Math.min(stock, MAX_QUANTITY) : MAX_QUANTITY,
    specs: (Array.isArray(rawProduct.specs) ? rawProduct.specs : [])
      .map((spec) => ({ label: toTrimmedText(spec?.label), value: toTrimmedText(spec?.value) }))
      .filter((spec) => spec.label && spec.value),
  };
}

/**
 * Big photo + thumbnails (only with more than one image); a thumbnail shows its photo.
 * @param {Object} product Normalised product
 * @param {string} imageErrorMessage
 * @returns {Element} div.product-detail-gallery
 */
function buildProductGallery(product, imageErrorMessage) {
  const gallery = createElementWithClass('div', 'product-detail-gallery');
  const media = createElementWithClass('div', 'product-detail-media');
  const showImageError = () => {
    media.replaceChildren();
    if (imageErrorMessage) {
      media.append(createElementWithClass('div', 'product-detail-media-fallback', imageErrorMessage));
    }
  };
  const showImage = (src) => {
    const img = createElementWithClass('img', 'product-detail-image');
    img.src = src;
    img.alt = product.fullName;
    img.fetchPriority = 'high';
    img.addEventListener('error', showImageError, { once: true });
    media.replaceChildren(img);
  };
  if (product.images.length) showImage(product.images[0]);
  else showImageError();
  gallery.append(media);

  if (product.images.length > 1) {
    const row = createElementWithClass('div', 'product-detail-thumbnails-row row row-gutter-8');
    product.images.forEach((src, index) => {
      const column = createElementWithClass('div', 'product-detail-thumbnail-cell col-8');
      const thumbnail = createElementWithClass('button', 'product-detail-thumbnail');
      thumbnail.type = 'button';
      thumbnail.setAttribute('aria-label', LABELS.image(index + 1, product.images.length));
      if (index === 0) thumbnail.setAttribute('aria-current', 'true');
      const img = createElementWithClass('img', 'product-detail-thumbnail-image');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      thumbnail.append(img);
      thumbnail.addEventListener('click', () => {
        row.querySelectorAll('.product-detail-thumbnail').forEach((other) => other.removeAttribute('aria-current'));
        thumbnail.setAttribute('aria-current', 'true');
        showImage(src);
      });
      column.append(thumbnail);
      row.append(column);
    });
    const thumbnails = createElementWithClass('div', 'product-detail-thumbnails container-fluid');
    thumbnails.append(row);
    gallery.append(thumbnails);
  }
  return gallery;
}

/**
 * Tags, brand, name (main heading), rating and prices (savings and installments).
 * @param {Object} product Normalised product
 * @param {Object} settings readDetailSettings() result
 * @returns {Element[]}
 */
function buildProductSummary(product, settings) {
  const { texts } = settings;
  const parts = [];
  if (product.badge || product.promo) {
    const tags = createElementWithClass('div', 'product-detail-tags');
    if (product.badge) tags.append(createElementWithClass('div', 'product-detail-badge', product.badge));
    if (product.promo) tags.append(createElementWithClass('div', 'product-detail-promo', product.promo));
    parts.push(tags);
  }
  if (product.brand) parts.push(createElementWithClass('div', 'product-detail-brand', product.brand));
  const title = createElementWithClass('div', 'product-detail-title', product.name);
  title.setAttribute('role', 'heading');
  title.setAttribute('aria-level', '1');
  parts.push(title);

  if (product.rating !== null) {
    const count = product.reviews === null ? '' : formatCount(product.reviews);
    const rating = createElementWithClass('div', 'product-detail-rating');
    rating.setAttribute('role', 'img');
    rating.setAttribute('aria-label', LABELS.rating(product.rating, count));
    const stars = createElementWithClass('span', 'product-detail-stars', '★★★★★');
    // only the value (0-5); product-detail.css turns it into the fill
    stars.style.setProperty('--product-detail-rating', String(product.rating));
    rating.append(stars, createElementWithClass('span', 'product-detail-rating-value', String(product.rating)));
    if (count && texts.reviews) {
      rating.append(createElementWithClass('span', 'product-detail-reviews', texts.reviews.replace('{count}', count)));
    }
    parts.push(rating);
  }

  const prices = createElementWithClass('div', 'product-detail-prices');
  prices.append(createElementWithClass('div', 'product-detail-price', formatPrice(product.price, product.currency)));
  if (product.oldPrice !== null) {
    const line = createElementWithClass('div', 'product-detail-price-line');
    const old = createElementWithClass('div', 'product-detail-old-price');
    old.setAttribute('role', 'deletion');
    old.append(
      createElementWithClass('span', 'product-detail-sr-only', `${LABELS.oldPrice}: `),
      formatPrice(product.oldPrice, product.currency),
    );
    line.append(old);
    if (texts.savings) {
      const savings = formatPrice(product.oldPrice - product.price, product.currency);
      line.append(createElementWithClass('div', 'product-detail-savings', texts.savings.replace('{amount}', savings)));
    }
    prices.append(line);
  }
  if (texts.installments && settings.installmentsMonths) {
    // "O 12 MSI de $2,500/mes sin intereses": "{months} MSI" stands out
    const monthlyAmount = Math.ceil(product.price / settings.installmentsMonths);
    const monthly = formatPrice(monthlyAmount, product.currency);
    const installments = createElementWithClass('div', 'product-detail-installments');
    const [before, after = ''] = texts.installments.replace('{amount}', monthly).split('{months}');
    const highlight = after.match(/^\s*MSI/i)?.[0] || '';
    installments.append(
      before,
      createElementWithClass('span', 'product-detail-installments-highlight', `${settings.installmentsMonths}${highlight}`),
      after.slice(highlight.length),
    );
    prices.append(installments);
  }
  parts.push(prices);
  return parts;
}

/**
 * One group of option buttons (colours or storages); a click selects it (aria-pressed).
 * @param {string} className Group class (product-detail-colors | product-detail-storages)
 * @param {Element[]} buttons
 * @param {Function} [onSelect] Called with the index of the selected button
 * @returns {Element}
 */
function buildOptionButtons(className, buttons, onSelect) {
  const options = createElementWithClass('div', className);
  options.setAttribute('role', 'group');
  buttons.forEach((button, index) => {
    button.type = 'button';
    button.setAttribute('aria-pressed', String(index === 0));
    button.addEventListener('click', () => {
      buttons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      onSelect?.(index);
    });
    options.append(button);
  });
  return options;
}

/**
 * Colour, storage, stock, quantity, "Agregar al carrito" and favourite.
 * @param {Object} product Normalised product
 * @param {Object} settings readDetailSettings() result
 * @returns {Element[]}
 */
function buildPurchaseOptions(product, settings) {
  const { texts } = settings;
  const parts = [];

  if (product.colors.length) {
    const field = createElementWithClass('div', 'product-detail-field');
    const label = createElementWithClass('div', 'product-detail-field-label');
    const selectedName = createElementWithClass('span', 'product-detail-field-value', product.colors[0].name);
    if (texts.colorLabel) label.append(`${texts.colorLabel} `, selectedName);
    const swatches = product.colors.map((color, index) => {
      const swatch = createElementWithClass('button', 'product-detail-swatch');
      swatch.setAttribute('aria-label', color.name || LABELS.color(index + 1));
      // the colour comes from the service; product-detail.css paints it
      swatch.style.setProperty('--product-detail-swatch-color', color.hex);
      return swatch;
    });
    const group = buildOptionButtons('product-detail-colors', swatches, (index) => {
      selectedName.textContent = product.colors[index].name;
    });
    if (texts.colorLabel) group.setAttribute('aria-label', texts.colorLabel);
    field.append(...[texts.colorLabel ? label : null, group].filter(Boolean));
    parts.push(field);
  }

  if (product.storages.length) {
    const field = createElementWithClass('div', 'product-detail-field');
    const buttons = product.storages.map((storage) => createElementWithClass('button', 'product-detail-storage', storage));
    const group = buildOptionButtons('product-detail-storages', buttons);
    if (texts.storageLabel) {
      group.setAttribute('aria-label', texts.storageLabel);
      field.append(createElementWithClass('div', 'product-detail-field-label', texts.storageLabel));
    }
    field.append(group);
    parts.push(field);
  }

  const stockText = product.isAvailable ? texts.inStock : texts.soldOut;
  if (stockText) {
    parts.push(createElementWithClass('div', `product-detail-stock ${product.isAvailable ? 'is-available' : 'is-sold-out'}`, stockText));
  }

  const quantity = createElementWithClass('div', 'product-detail-quantity');
  if (texts.quantityLabel) quantity.append(createElementWithClass('div', 'product-detail-field-label', texts.quantityLabel));
  const stepper = createElementWithClass('div', 'product-detail-stepper');
  const decrease = createElementWithClass('button', 'product-detail-step', '−');
  const value = createElementWithClass('div', 'product-detail-quantity-value', '1');
  const increase = createElementWithClass('button', 'product-detail-step', '+');
  value.setAttribute('aria-live', 'polite');
  [decrease, increase].forEach((button) => { button.type = 'button'; });
  decrease.setAttribute('aria-label', LABELS.decrease);
  increase.setAttribute('aria-label', LABELS.increase);
  let count = 1;
  const renderCount = () => {
    value.textContent = String(count);
    decrease.disabled = !product.isAvailable || count <= 1;
    increase.disabled = !product.isAvailable || count >= product.maxQuantity;
  };
  decrease.addEventListener('click', () => { count = Math.max(1, count - 1); renderCount(); });
  increase.addEventListener('click', () => { count = Math.min(product.maxQuantity, count + 1); renderCount(); });
  renderCount();
  stepper.append(decrease, value, increase);
  quantity.append(stepper);
  parts.push(quantity);

  const actionsRow = createElementWithClass('div', 'product-detail-actions-row row row-gutter-8');
  if (texts.button) {
    const cartColumn = createElementWithClass('div', 'product-detail-cart-cell col');
    // painted only: it will open the cart screen (cart service), still to be built
    const cart = createElementWithClass('button', 'product-detail-cart', texts.button);
    cart.type = 'button';
    cart.disabled = !product.isAvailable;
    cartColumn.append(cart);
    actionsRow.append(cartColumn);
  }
  const favoriteColumn = createElementWithClass('div', 'product-detail-favorite-cell col-auto');
  const favorite = createElementWithClass('button', 'product-detail-favorite');
  favorite.type = 'button';
  favorite.setAttribute('aria-label', LABELS.favorite);
  favorite.setAttribute('aria-pressed', 'false');
  favorite.addEventListener('click', () => {
    favorite.setAttribute('aria-pressed', String(favorite.getAttribute('aria-pressed') !== 'true'));
  });
  favoriteColumn.append(favorite);
  actionsRow.append(favoriteColumn);
  const actions = createElementWithClass('div', 'product-detail-actions container-fluid');
  actions.append(actionsRow);
  parts.push(actions);
  return parts;
}

/**
 * The "Benefit N" rows (envío, compra segura, devoluciones) in a soft box.
 * @param {{icon: string, text: string}[]} benefits
 * @returns {Element|null}
 */
function buildBenefits(benefits) {
  if (!benefits.length) return null;
  const list = createElementWithClass('div', 'product-detail-benefits');
  list.setAttribute('role', 'list');
  benefits.forEach(({ icon, text }) => {
    const item = createElementWithClass('div', 'product-detail-benefit');
    item.setAttribute('role', 'listitem');
    if (icon) {
      const iconPart = createElementWithClass('span', 'product-detail-benefit-icon', icon);
      iconPart.setAttribute('aria-hidden', 'true');
      item.append(iconPart);
    }
    item.append(createElementWithClass('span', 'product-detail-benefit-text', text));
    list.append(item);
  });
  return list;
}

/**
 * "Características principales": label | value rows with the grid.
 * @param {{label: string, value: string}[]} specs
 * @param {string} specsTitle Specs Title row
 * @returns {Element|null}
 */
function buildSpecs(specs, specsTitle) {
  if (!specs.length) return null;
  const section = createElementWithClass('div', 'product-detail-specs');
  if (specsTitle) {
    const title = createElementWithClass('div', 'product-detail-specs-title', specsTitle);
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '2');
    section.append(title);
  }
  const table = createElementWithClass('div', 'product-detail-specs-table container-fluid');
  table.setAttribute('role', 'table');
  if (specsTitle) table.setAttribute('aria-label', specsTitle);
  specs.forEach(({ label, value }) => {
    const row = createElementWithClass('div', 'product-detail-spec row row-gutter-16');
    row.setAttribute('role', 'row');
    const labelCell = createElementWithClass('div', 'product-detail-spec-label col-9 col-md-6 col-lg-4', label);
    labelCell.setAttribute('role', 'rowheader');
    const valueCell = createElementWithClass('div', 'product-detail-spec-value col-15 col-md-18 col-lg-20', value);
    valueCell.setAttribute('role', 'cell');
    row.append(labelCell, valueCell);
    table.append(row);
  });
  section.append(table);
  return section;
}

/**
 * Grey placeholders while the service answers (avoids layout shift); same grid columns.
 * @returns {Element}
 */
function buildDetailSkeleton() {
  const row = createElementWithClass('div', 'product-detail-layout-row row row-gutter-48 row-gutter-y-24');
  row.setAttribute('aria-hidden', 'true');
  const galleryColumn = createElementWithClass('div', 'product-detail-col-gallery col-24 col-md-12');
  galleryColumn.append(createElementWithClass('div', 'product-detail-skeleton product-detail-skeleton-media'));
  const infoColumn = createElementWithClass('div', 'product-detail-col-info col-24 col-md-12');
  ['is-short', 'is-title', 'is-medium', 'is-price', 'is-block'].forEach((size) => {
    infoColumn.append(createElementWithClass('div', `product-detail-skeleton product-detail-skeleton-line ${size}`));
  });
  row.append(galleryColumn, infoColumn);
  const layout = createElementWithClass('div', 'product-detail-layout container-fluid');
  layout.append(row);
  return layout;
}

/**
 * The phone: gallery + information in two grid columns, then the specs.
 * @param {Element} block
 * @param {Object} product Normalised product
 * @param {Object} settings readDetailSettings() result
 */
function renderProductDetail(block, product, settings) {
  block.removeAttribute('aria-busy');
  const row = createElementWithClass('div', 'product-detail-layout-row row row-gutter-48 row-gutter-y-24');
  const galleryColumn = createElementWithClass('div', 'product-detail-col-gallery col-24 col-md-12');
  galleryColumn.append(buildProductGallery(product, settings.messages.imageErrorMessage));
  const infoColumn = createElementWithClass('div', 'product-detail-col-info col-24 col-md-12');
  infoColumn.append(
    ...buildProductSummary(product, settings),
    ...buildPurchaseOptions(product, settings),
    ...[buildBenefits(settings.benefits)].filter(Boolean),
  );
  row.append(galleryColumn, infoColumn);
  const layout = createElementWithClass('div', 'product-detail-layout container-fluid');
  layout.append(row);
  const specs = buildSpecs(product.specs, settings.texts.specsTitle);
  block.replaceChildren(...[layout, specs].filter(Boolean));

  // breadcrumb "{product}" level and the browser tab
  setCurrentPageName(product.fullName);
  // "Celular | NovaMóvil" → "Apple iPhone 15 Pro | NovaMóvil" (page title or og:title)
  const pageTitle = document.title || getMetadata('og:title');
  const titleSuffix = pageTitle.includes('|') ? pageTitle.slice(pageTitle.indexOf('|')) : '';
  document.title = `${product.fullName} ${titleSuffix}`.trim();
}

/**
 * "Not available" message (no product, no Endpoint or service error) with a link back to
 * the catalogue (Back Text row).
 * @param {Element} block
 * @param {Object} settings readDetailSettings() result
 */
function renderNotAvailable(block, settings) {
  block.removeAttribute('aria-busy');
  const content = [buildEmptyListMessage({
    icon: settings.messages.emptyListIcon,
    title: settings.messages.emptyListTitle,
    description: settings.messages.emptyListDescription,
  })];
  if (settings.texts.back) {
    const back = createElementWithClass('a', 'product-detail-back', settings.texts.back);
    back.href = settings.catalogLink;
    content.push(back);
  }
  block.replaceChildren(...content);
}

/**
 * Loads the phone from the service; on any error logs it, shows the alert and the
 * "not available" message.
 * @param {Element} block
 * @param {string} sku Phone identifier from the URL
 * @param {Object} settings readDetailSettings() result
 */
async function loadProductFromService(block, sku, settings) {
  try {
    const response = await post(settings.endpoint, {
      meta: DETAIL_REQUEST_META,
      security: DETAIL_REQUEST_SECURITY,
      data: { productId: sku },
    });
    const product = normalizeProduct(response?.data);
    if (product) renderProductDetail(block, product, settings);
    else renderNotAvailable(block, settings);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[product-detail] Could not load product', sku, 'from', settings.endpoint, error);
    showToast(settings.messages.errorResponseMessage, settings.alert);
    renderNotAvailable(block, settings);
  }
}

/**
 * Product Detail: one phone fed by the detail service (no internal JSON).
 * The block name gives the main .product-detail class that scopes every style.
 * @param {Element} block The product-detail block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readDetailSettings(block);
  const sku = readSkuFromUrl();
  if (!sku) {
    // no phone in the URL: back to the catalogue (replace: "back" does not return here)
    block.replaceChildren();
    window.location.replace(settings.catalogLink);
    return;
  }
  if (!settings.endpoint) {
    renderNotAvailable(block, settings);
    return;
  }
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(buildDetailSkeleton());
  loadProductFromService(block, sku, settings);
}
