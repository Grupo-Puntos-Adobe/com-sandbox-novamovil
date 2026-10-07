/*
 * Product Catalog block: title + results count + sort, a filters box and the list of phones,
 * with pagination. Filters come from a GET service (Filters Endpoint) and the phones from a
 * POST search (Search Endpoint); without endpoints the block uses its internal JSON.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Product Catalog" table.
 *
 * Authored rows (all optional): Styles, Classname, Title, Results Text ("{count} productos
 * encontrados"), Results Text One ("{count} producto encontrado"), Sort Label, Filters Title,
 * Brand Label, OS Label, Storage Label, Price Label, Apply Text, Filters Endpoint,
 * Search Endpoint, Category, Page Size, Product Link ("/productos/{sku}"), Button Text,
 * Available Text, Sold Out Text, Alert Duration, Alert Color, Error Response Message,
 * Empty List Title, Empty List Description, Empty List Icon, Image Error Message.
 * Defaults only for messages and configuration:
 *   - Content (Title, the texts and labels, Button Text, Product Link) has no default:
 *     without text in the table that part is not painted.
 *   - Empty List Title / Description / Icon and Image Error Message (readRowTextOrDefault):
 *     row missing → default (scripts/foundations/messages.js, EMPTY_LIST_ICON below);
 *     row present but empty → not painted.
 *   - Error Response Message, Alert Duration, Alert Color, Page Size: missing or empty → default.
 *
 * Search request: only `data` changes (selected filters, price, sort and page); `meta` and
 * `security` are fixed (SEARCH_REQUEST_META, SEARCH_REQUEST_SECURITY), as the service expects.
 * An empty list in data.brands / os / storage means "no filter of that kind".
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)                  Styles / Classname rows
 *     ├─ readCatalogSettings(block)                texts, endpoints, alert, messages
 *     ├─ buildCatalogToolbar() · buildCatalogLayout() + skeletons
 *     └─ startCatalog()
 *          ├─ loadFiltersFromService()   get(Filters Endpoint) → normalizeFilters()
 *          │                             (error → alert + FALLBACK_FILTERS)
 *          ├─ renderFiltersPanel()       checkboxes + price range; change → searchPhones()
 *          └─ searchPhones()             post(Search Endpoint, buildSearchRequest())
 *                                        (no endpoint → searchFallbackPhones())
 *               ├─ ok    → renderCatalogResults(): buildPhoneCard() per phone + buildPagination()
 *               └─ error → console.error + showToast(errorResponseMessage) + empty message
 *
 * No resolution logic here: product-catalog.css decides what each resolution shows (the
 * filters are a box on tablet/desktop and a full-screen panel on mobile). JS only toggles
 * is-open / aria-expanded. Columns come from the grid (styles/foundations/grid.css):
 *   toolbar  container-fluid > row row-middle row-gutter-16 > col-24 col-md (title) + col-24
 *            col-md-auto (controls: container-fluid > row row-middle row-gutter-8 > col-auto ×2)
 *   layout   container-fluid > row row-gutter-32 > col-24 col-md-8 col-lg-5 (filters)
 *            + col-24 col-md-16 col-lg-19 (results)
 *   results  container-fluid > row row-gutter-16 row-gutter-y-16 > col-24 col-lg-6 (each phone:
 *            1 per row on mobile and tablet, 4 on desktop)
 *   card     brand + status: container-fluid > row row-middle row-gutter-8 > col + col-auto
 *
 * Markup is all divs except the links (<a>), the images (<img>), the buttons (<button>) and the
 * form controls (<label> + <input type=checkbox|range>, <select>). The empty message
 * (div.empty-list-message) comes from blocks/empty-list-message.
 *
 * Expected responses:
 *   filters: { data: { brands: [], operatingSystems: [], storages: [], priceRange: { min, max } } }
 *   search:  { pagination: { page, pageSize, totalItems, totalPages }, data: [{ id, sku, brand,
 *            name, storage, ram, os, price, salePrice, oldPrice, promo, badge, stock,
 *            available, active, rating, image, path? }] }
 * Guide: blocks/product-catalog/README.md
 */
import { readBlockConfig } from '../../scripts/aem.js';
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { get, post } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/foundations/toast.js';
import MESSAGES, { CURRENCY, LOCALE } from '../../scripts/foundations/messages.js';
import {
  readTableCell, readRowTextOrDefault, getAlertOptions, getSafeHref, formatPrice,
} from '../../scripts/foundations/block-utils.js';
import { buildEmptyListMessage } from '../empty-list-message/empty-list-message.js';

// fixed parts of the search request (only `data` changes)
const SEARCH_REQUEST_META = {
  requestId: 'REQ-PROD-001',
  correlationId: 'CORR-000001',
  timestamp: '2026-09-17T16:00:00Z',
  channel: 'WEB',
  platform: 'DESKTOP',
};
const SEARCH_REQUEST_SECURITY = {
  auth: { type: 'Bearer', value: 'Bearer {{bearer_token}}' },
  nonce: 'NONCE-PROD-001',
  signature: '{{hmac_signature}}',
};

// "Ordenar por" options: label shown → value sent in data.sortBy
const SORT_OPTIONS = [
  { label: 'Relevancia', value: 'relevancia' },
  { label: 'Precio: menor a mayor', value: 'precio-asc' },
  { label: 'Precio: mayor a menor', value: 'precio-desc' },
  { label: 'Mejor calificados', value: 'mejor-calificados' },
];

// used when the document has no Filters Endpoint row (or the service fails)
const FALLBACK_FILTERS = {
  brands: ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Google'],
  operatingSystems: ['iOS', 'Android'],
  storages: ['128 GB', '256 GB', '512 GB'],
  priceRange: { min: 5000, max: 40000 },
};

// used when the document has no Search Endpoint row (filtered and sorted in the browser)
const FALLBACK_PHONES = [
  {
    id: 'PROD-101', sku: 'IPH-15P-256', brand: 'Apple', name: 'iPhone 15 Pro', os: 'iOS', storage: '256 GB', ram: '8 GB', salePrice: 29999, oldPrice: 34999, promo: '14% OFF', badge: 'Más vendido', rating: 4.8, stock: 12, available: true, image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80',
  },
  {
    id: 'PROD-102', sku: 'SAM-S24U-512', brand: 'Samsung', name: 'Galaxy S24 Ultra', os: 'Android', storage: '512 GB', ram: '12 GB', salePrice: 32999, oldPrice: 37999, promo: '13% OFF', badge: 'Nuevo', rating: 4.7, stock: 9, available: true, image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80',
  },
  {
    id: 'PROD-103', sku: 'MOT-E50P-256', brand: 'Motorola', name: 'Edge 50 Pro', os: 'Android', storage: '256 GB', ram: '12 GB', salePrice: 14999, oldPrice: 17999, promo: '17% OFF', rating: 4.5, stock: 14, available: true, image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&q=80',
  },
  {
    id: 'PROD-104', sku: 'XIA-14U-512', brand: 'Xiaomi', name: '14 Ultra', os: 'Android', storage: '512 GB', ram: '16 GB', salePrice: 27999, oldPrice: 29999, promo: '7% OFF', badge: 'Premium', rating: 4.6, stock: 6, available: true, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80',
  },
  {
    id: 'PROD-105', sku: 'GOO-P8P-256', brand: 'Google', name: 'Pixel 8 Pro', os: 'Android', storage: '256 GB', ram: '12 GB', salePrice: 22999, oldPrice: 24999, promo: '8% OFF', rating: 4.6, stock: 7, available: true, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80',
  },
  {
    id: 'PROD-106', sku: 'IPH-15-128', brand: 'Apple', name: 'iPhone 15', os: 'iOS', storage: '128 GB', ram: '6 GB', salePrice: 19999, oldPrice: 22999, promo: '13% OFF', rating: 4.6, stock: 18, available: true, image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&q=80',
  },
];

const DEFAULT_PAGE_SIZE = 30;
const PRICE_STEP = 500;
// grey placeholder cards painted while the search answers
const SKELETON_ELEMENTS = 4;
// icon of the "no phones" message, unless the table has an Empty List Icon row
const EMPTY_LIST_ICON = '📱';
// texts only read by screen readers, plus the mobile toggle text when there is no Filters Title
const LABELS = {
  openFilters: 'Filtros',
  sort: 'Ordenar por',
  closeFilters: 'Cerrar filtros',
  pagination: 'Paginación',
  previousPage: 'Página anterior',
  nextPage: 'Página siguiente',
  page: (number) => `Página ${number}`,
  oldPrice: 'Precio anterior',
};

// each instance gets its own ids (labels, aria-controls)
let catalogCount = 0;

// service values → trimmed string ('' if not a string) / number (null if not numeric)
const toTrimmedText = (value) => (typeof value === 'string' ? value.trim() : '');
const toNumberOrNull = (value) => (value === null || value === '' || !Number.isFinite(Number(value))
  ? null : Number(value));
const toTextList = (values) => [...new Set((Array.isArray(values) ? values : [])
  .map(toTrimmedText).filter(Boolean))];

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
 * Everything the block reads from its table, with the defaults applied.
 * @param {Element} block
 * @returns {Object} texts, endpoints, category, pageSize, linkTemplate, alert and messages
 */
function readCatalogSettings(block) {
  const readCellText = (key) => readTableCell(block, key).text;
  const readEndpoint = (key) => {
    const cell = readTableCell(block, key);
    return cell.href || cell.text;
  };
  const pageSize = Number.parseInt(readCellText('page size'), 10);
  return {
    texts: {
      title: readCellText('title'),
      results: readCellText('results text'),
      resultsOne: readCellText('results text one'),
      sortLabel: readCellText('sort label'),
      filtersTitle: readCellText('filters title'),
      brandLabel: readCellText('brand label'),
      osLabel: readCellText('os label'),
      storageLabel: readCellText('storage label'),
      priceLabel: readCellText('price label'),
      apply: readCellText('apply text'),
      button: readCellText('button text'),
      available: readCellText('available text'),
      soldOut: readCellText('sold out text'),
    },
    filtersEndpoint: readEndpoint('filters endpoint'),
    searchEndpoint: readEndpoint('search endpoint'),
    category: readCellText('category'),
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
    linkTemplate: readCellText('product link'),
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
 * Filter options from the service (or the fallback), validated.
 * @param {Object} rawFilters data of the filters response
 * @returns {{brands: string[], operatingSystems: string[], storages: string[],
 *   priceRange: {min: number, max: number}}}
 */
function normalizeFilters(rawFilters) {
  const min = toNumberOrNull(rawFilters?.priceRange?.min);
  const max = toNumberOrNull(rawFilters?.priceRange?.max);
  const validRange = min !== null && max !== null && max > min;
  return {
    brands: toTextList(rawFilters?.brands),
    operatingSystems: toTextList(rawFilters?.operatingSystems),
    storages: toTextList(rawFilters?.storages),
    priceRange: validRange ? { min, max } : { ...FALLBACK_FILTERS.priceRange },
  };
}

/**
 * Builds the phone link from its own path/url or the authored template,
 * e.g. "/productos/{sku}" (placeholders: {sku}, {productId}, {id}).
 * @param {Object} item Raw phone
 * @param {string} linkTemplate Product Link row ('' when the table has none)
 * @returns {string|null}
 */
function buildPhoneHref(item, linkTemplate) {
  const own = getSafeHref(item.path || item.url);
  if (own) return own;
  if (!linkTemplate) return null;
  const filled = linkTemplate.replace(/\{(sku|productId|id)\}/g, (placeholder, key) => encodeURIComponent(String(item[key] ?? '').toLowerCase()));
  return /\{|\/\/?$/.test(filled) ? null : getSafeHref(filled);
}

/**
 * Active phones with a name and a price, without duplicates (href null = no link).
 * The price shown is salePrice (the selling price) or, without it, price; the old price only
 * when it is higher.
 * @param {Object[]} rawPhones Phones as they come (service or fallback)
 * @param {string} linkTemplate Product Link row
 * @returns {Object[]} the normalised phones
 */
function normalizePhones(rawPhones, linkTemplate) {
  const seen = new Set();
  return (Array.isArray(rawPhones) ? rawPhones : [])
    .filter((item) => item && item.active !== false)
    .map((item) => {
      const price = toNumberOrNull(item.salePrice) ?? toNumberOrNull(item.price);
      const oldPrice = toNumberOrNull(item.oldPrice);
      const stock = toNumberOrNull(item.stock);
      const brand = toTrimmedText(item.brand);
      const name = toTrimmedText(item.name) || toTrimmedText(item.model);
      return {
        id: String(item.id ?? item.productId ?? item.sku ?? ''),
        brand,
        name,
        os: toTrimmedText(item.os),
        storage: toTrimmedText(item.storage),
        ram: toTrimmedText(item.ram),
        image: getSafeHref(item.image || item.imageUrl),
        imageAlt: toTrimmedText(item.description) || `${brand} ${name}`.trim(),
        price,
        oldPrice: oldPrice !== null && price !== null && oldPrice > price ? oldPrice : null,
        currency: /^[A-Z]{3}$/.test(toTrimmedText(item.currency)) ? toTrimmedText(item.currency) : CURRENCY,
        promo: toTrimmedText(item.promo),
        badge: toTrimmedText(item.badge),
        rating: toNumberOrNull(item.rating),
        isAvailable: item.available !== false && (stock === null || stock > 0),
        href: buildPhoneHref(item, linkTemplate),
      };
    })
    .filter((item) => {
      if (!item.name || item.price === null || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

/**
 * The `data` of the search request from the current selection (the only part that changes).
 * @param {Object} state Catalog state
 * @param {Object} settings readCatalogSettings() result
 * @returns {Object} full request body (meta + security + data)
 */
function buildSearchRequest(state, settings) {
  const data = {
    minPrice: state.filters.priceRange.min,
    maxPrice: state.maxPrice,
    page: state.page,
    pageSize: settings.pageSize,
    brands: [...state.selected.brands],
    os: [...state.selected.os],
    storage: [...state.selected.storage],
    sortBy: state.sortBy,
  };
  if (settings.category) data.category = settings.category;
  return { meta: SEARCH_REQUEST_META, security: SEARCH_REQUEST_SECURITY, data };
}

/**
 * Without Search Endpoint: filters, sorts and pages the internal JSON in the browser,
 * answering like the service does.
 * @param {Object} state Catalog state
 * @param {Object} settings readCatalogSettings() result
 * @returns {{phones: Object[], totalItems: number, totalPages: number}}
 */
function searchFallbackPhones(state, settings) {
  const { brands, os, storage } = state.selected;
  const matches = normalizePhones(FALLBACK_PHONES, settings.linkTemplate).filter((phone) => (
    (!brands.size || brands.has(phone.brand))
    && (!os.size || os.has(phone.os))
    && (!storage.size || storage.has(phone.storage))
    && phone.price <= state.maxPrice
  ));
  const sorters = {
    'precio-asc': (first, second) => first.price - second.price,
    'precio-desc': (first, second) => second.price - first.price,
    'mejor-calificados': (first, second) => (second.rating ?? 0) - (first.rating ?? 0),
  };
  if (sorters[state.sortBy]) matches.sort(sorters[state.sortBy]);
  const totalPages = Math.max(1, Math.ceil(matches.length / settings.pageSize));
  const start = (state.page - 1) * settings.pageSize;
  return {
    phones: matches.slice(start, start + settings.pageSize),
    totalItems: matches.length,
    totalPages,
  };
}

/**
 * Title (main heading of the page), results count and the controls (filters toggle for
 * mobile + sort select), laid out with the grid.
 * @param {Object} settings readCatalogSettings() result
 * @param {string} idPrefix Unique prefix of this instance
 * @returns {{toolbar: Element, count: Element, toggle: Element, sort: Element}}
 */
function buildCatalogToolbar(settings, idPrefix) {
  const { texts } = settings;
  const heading = createElementWithClass('div', 'product-catalog-col-title col-24 col-md');
  if (texts.title) {
    const title = createElementWithClass('div', 'product-catalog-title', texts.title);
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '1');
    heading.append(title);
  }
  const count = createElementWithClass('div', 'product-catalog-count');
  count.setAttribute('role', 'status');
  heading.append(count);

  const toggle = createElementWithClass('button', 'product-catalog-filters-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', `${idPrefix}-filters`);
  toggle.append(
    createElementWithClass('span', 'product-catalog-filters-toggle-text', texts.filtersTitle || LABELS.openFilters),
    createElementWithClass('span', 'product-catalog-filters-toggle-badge'),
  );

  const sortColumn = createElementWithClass('div', 'product-catalog-sort-field col col-md-auto');
  const sort = createElementWithClass('select', 'product-catalog-sort');
  sort.id = `${idPrefix}-sort`;
  SORT_OPTIONS.forEach(({ label, value }) => sort.append(new Option(label, value)));
  if (texts.sortLabel) {
    const label = createElementWithClass('label', 'product-catalog-sort-label', texts.sortLabel);
    label.htmlFor = sort.id;
    sortColumn.append(label);
  } else {
    sort.setAttribute('aria-label', LABELS.sort);
  }
  sortColumn.append(sort);

  const controlsRow = createElementWithClass('div', 'product-catalog-controls-row row row-middle row-gutter-8');
  const toggleColumn = createElementWithClass('div', 'product-catalog-toggle-field col-auto');
  toggleColumn.append(toggle);
  controlsRow.append(toggleColumn, sortColumn);
  const controls = createElementWithClass('div', 'product-catalog-controls container-fluid');
  controls.append(controlsRow);
  const controlsColumn = createElementWithClass('div', 'product-catalog-col-controls col-24 col-md-auto');
  controlsColumn.append(controls);

  const row = createElementWithClass('div', 'product-catalog-toolbar-row row row-middle row-gutter-16');
  row.append(heading, controlsColumn);
  const toolbar = createElementWithClass('div', 'product-catalog-toolbar container-fluid');
  toolbar.append(row);
  return {
    toolbar, count, toggle, sort,
  };
}

/**
 * Grey placeholder cards shown while the search answers (avoids layout shift); same grid
 * columns as the real cards.
 * @returns {Element} div.product-catalog-grid.container-fluid > row, hidden from screen readers
 */
function buildPhonesSkeleton() {
  const list = createElementWithClass('div', 'product-catalog-list row row-gutter-16 row-gutter-y-16');
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SKELETON_ELEMENTS; i += 1) {
    const cell = createElementWithClass('div', 'product-catalog-cell col-24 col-lg-6');
    cell.append(createElementWithClass('div', 'product-catalog-skeleton'));
    list.append(cell);
  }
  const grid = createElementWithClass('div', 'product-catalog-grid container-fluid');
  grid.append(list);
  return grid;
}

/**
 * Filters column (box on tablet/desktop, panel on mobile) + results column.
 * @param {Object} settings readCatalogSettings() result
 * @param {string} idPrefix Unique prefix of this instance
 * @returns {{layout: Element, filters: Element, results: Element}}
 */
function buildCatalogLayout(settings, idPrefix) {
  const filters = createElementWithClass('div', 'product-catalog-filters');
  filters.id = `${idPrefix}-filters`;
  filters.setAttribute('role', 'region');
  filters.setAttribute('aria-label', settings.texts.filtersTitle || LABELS.openFilters);
  filters.append(createElementWithClass('div', 'product-catalog-filters-skeleton'));
  const filtersColumn = createElementWithClass('div', 'product-catalog-col-filters col-24 col-md-8 col-lg-5');
  filtersColumn.append(filters);

  const results = createElementWithClass('div', 'product-catalog-results');
  results.setAttribute('aria-busy', 'true');
  results.append(buildPhonesSkeleton());
  const resultsColumn = createElementWithClass('div', 'product-catalog-col-results col-24 col-md-16 col-lg-19');
  resultsColumn.append(results);

  const row = createElementWithClass('div', 'product-catalog-layout-row row row-gutter-32');
  row.append(filtersColumn, resultsColumn);
  const layout = createElementWithClass('div', 'product-catalog-layout container-fluid');
  layout.append(row);
  return { layout, filters, results };
}

/**
 * One group of checkboxes (Marca, Sistema operativo, Capacidad).
 * @param {string} label Group label from the table ('' = no visible label)
 * @param {string[]} values Options from the filters service
 * @param {Set<string>} selected Selected values of this group (updated on change)
 * @param {Function} onChange Called after any change
 * @param {string} groupId Unique id of the group
 * @returns {Element|null} div.product-catalog-filter-group[role=group], null without options
 */
function buildCheckboxGroup(label, values, selected, onChange, groupId) {
  if (!values.length) return null;
  const group = createElementWithClass('div', 'product-catalog-filter-group');
  group.setAttribute('role', 'group');
  if (label) {
    const groupLabel = createElementWithClass('div', 'product-catalog-filter-label', label);
    groupLabel.id = `${groupId}-label`;
    group.setAttribute('aria-labelledby', groupLabel.id);
    group.append(groupLabel);
  }
  const options = createElementWithClass('div', 'product-catalog-filter-options');
  values.forEach((value) => {
    const option = createElementWithClass('label', 'product-catalog-option');
    const checkbox = createElementWithClass('input', 'product-catalog-checkbox');
    checkbox.type = 'checkbox';
    checkbox.value = value;
    checkbox.checked = selected.has(value);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(value);
      else selected.delete(value);
      onChange();
    });
    option.append(checkbox, createElementWithClass('span', 'product-catalog-option-text', value));
    options.append(option);
  });
  group.append(options);
  return group;
}

/**
 * "Precio máximo": a range from priceRange.min to priceRange.max; the search runs when the
 * thumb is released (change), the shown value follows it while moving (input).
 * @param {Object} state Catalog state (maxPrice is updated)
 * @param {string} label Price Label row
 * @param {Function} onChange Called when the value is committed
 * @param {string} groupId Unique id of the group
 * @returns {Element} div.product-catalog-filter-group
 */
function buildPriceGroup(state, label, onChange, groupId) {
  const { min, max } = state.filters.priceRange;
  const group = createElementWithClass('div', 'product-catalog-filter-group product-catalog-price-group');
  const range = createElementWithClass('input', 'product-catalog-range');
  range.type = 'range';
  range.id = `${groupId}-range`;
  range.min = String(min);
  range.max = String(max);
  range.step = String(PRICE_STEP);
  range.value = String(state.maxPrice);
  if (label) {
    const groupLabel = createElementWithClass('label', 'product-catalog-filter-label', label);
    groupLabel.htmlFor = range.id;
    group.append(groupLabel);
  }
  const current = createElementWithClass('div', 'product-catalog-range-value');
  const showValue = () => {
    const text = formatPrice(Number(range.value), CURRENCY);
    current.textContent = text;
    range.setAttribute('aria-valuetext', text);
  };
  showValue();
  range.addEventListener('input', showValue);
  range.addEventListener('change', () => {
    state.maxPrice = Number(range.value);
    onChange();
  });
  const limits = createElementWithClass('div', 'product-catalog-range-limits');
  limits.append(createElementWithClass('div', 'product-catalog-range-min', formatPrice(min, CURRENCY)), current);
  group.append(range, limits);
  return group;
}

/**
 * The phone card: photo with badge and promo, brand + availability, name, storage/RAM chips,
 * prices and the button (the whole card opens the phone through its only link).
 * @param {Object} phone Normalised phone
 * @param {Object} settings readCatalogSettings() result
 * @returns {Element} div.product-catalog-cell[role=listitem]
 */
function buildPhoneCard(phone, settings) {
  const { texts, messages } = settings;
  const cell = createElementWithClass('div', 'product-catalog-cell col-24 col-lg-6');
  cell.setAttribute('role', 'listitem');
  const card = createElementWithClass('div', 'product-catalog-card');

  const media = createElementWithClass('div', 'product-catalog-media');
  const showImageError = () => {
    media.querySelector('.product-catalog-image')?.remove();
    if (messages.imageErrorMessage) {
      media.prepend(createElementWithClass('div', 'product-catalog-media-fallback', messages.imageErrorMessage));
    }
  };
  if (phone.image) {
    const img = createElementWithClass('img', 'product-catalog-image');
    img.src = phone.image;
    img.alt = phone.imageAlt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', showImageError, { once: true });
    media.append(img);
  } else {
    showImageError();
  }
  if (phone.badge) media.append(createElementWithClass('div', 'product-catalog-badge', phone.badge));
  if (phone.promo) media.append(createElementWithClass('div', 'product-catalog-promo', phone.promo));

  const body = createElementWithClass('div', 'product-catalog-body');
  const statusText = phone.isAvailable ? texts.available : texts.soldOut;
  if (phone.brand || statusText) {
    const metaRow = createElementWithClass('div', 'product-catalog-meta-row row row-middle row-gutter-8');
    metaRow.append(createElementWithClass('div', 'product-catalog-brand col', phone.brand));
    if (statusText) {
      const status = createElementWithClass('div', `product-catalog-status col-auto ${phone.isAvailable ? 'is-available' : 'is-sold-out'}`, statusText);
      metaRow.append(status);
    }
    const meta = createElementWithClass('div', 'product-catalog-meta container-fluid');
    meta.append(metaRow);
    body.append(meta);
  }

  const name = createElementWithClass('div', 'product-catalog-name');
  name.setAttribute('role', 'heading');
  name.setAttribute('aria-level', '2');
  if (phone.href && !texts.button) {
    const link = createElementWithClass('a', 'product-catalog-name-link', phone.name);
    link.href = phone.href;
    name.append(link);
  } else {
    name.textContent = phone.name;
  }
  body.append(name);

  const chips = [phone.storage, phone.ram].filter(Boolean);
  if (chips.length) {
    const chipList = createElementWithClass('div', 'product-catalog-chips');
    chipList.setAttribute('role', 'list');
    chips.forEach((chip) => {
      const item = createElementWithClass('div', 'product-catalog-chip', chip);
      item.setAttribute('role', 'listitem');
      chipList.append(item);
    });
    body.append(chipList);
  }

  const prices = createElementWithClass('div', 'product-catalog-prices');
  prices.append(createElementWithClass('div', 'product-catalog-price', formatPrice(phone.price, phone.currency)));
  if (phone.oldPrice !== null) {
    const old = createElementWithClass('div', 'product-catalog-old-price');
    old.setAttribute('role', 'deletion');
    old.append(
      createElementWithClass('span', 'product-catalog-sr-only', `${LABELS.oldPrice}: `),
      formatPrice(phone.oldPrice, phone.currency),
    );
    prices.append(old);
  }
  body.append(prices);

  if (phone.href && texts.button) {
    const button = createElementWithClass('a', 'product-catalog-button', texts.button);
    button.href = phone.href;
    // "Ver producto: Apple iPhone 15" (without repeating the brand when the name has it)
    const fullName = phone.name.toLowerCase().startsWith(phone.brand.toLowerCase())
      ? phone.name : `${phone.brand} ${phone.name}`.trim();
    button.setAttribute('aria-label', `${texts.button}: ${fullName}`);
    body.append(button);
  }

  card.append(media, body);
  cell.append(card);
  return cell;
}

/**
 * Page numbers to show: first, last, the current one and its neighbours; null = a gap (…).
 * @param {number} page Current page
 * @param {number} totalPages
 * @returns {(number|null)[]}
 */
function getVisiblePages(page, totalPages) {
  const pages = [];
  for (let number = 1; number <= totalPages; number += 1) {
    if (number === 1 || number === totalPages || Math.abs(number - page) <= 1) {
      pages.push(number);
    } else if (pages.at(-1) !== null) {
      pages.push(null);
    }
  }
  return pages;
}

/**
 * "‹ 1 2 3 ›" pagination; not painted with a single page.
 * @param {number} page Current page
 * @param {number} totalPages
 * @param {Function} onPageChange Called with the new page number
 * @returns {Element|null} div.product-catalog-pagination[role=navigation]
 */
function buildPagination(page, totalPages, onPageChange) {
  if (totalPages <= 1) return null;
  const pagination = createElementWithClass('div', 'product-catalog-pagination');
  pagination.setAttribute('role', 'navigation');
  pagination.setAttribute('aria-label', LABELS.pagination);
  const buildPageButton = (text, target, label, className) => {
    const button = createElementWithClass('button', `product-catalog-page ${className}`, text);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    if (target === page && className === 'is-number') button.setAttribute('aria-current', 'page');
    if (target < 1 || target > totalPages) button.disabled = true;
    else if (target !== page) button.addEventListener('click', () => onPageChange(target));
    return button;
  };
  pagination.append(buildPageButton('‹', page - 1, LABELS.previousPage, 'is-previous'));
  getVisiblePages(page, totalPages).forEach((number) => {
    pagination.append(number === null
      ? createElementWithClass('span', 'product-catalog-page-gap', '…')
      : buildPageButton(String(number), number, LABELS.page(number), 'is-number'));
  });
  pagination.append(buildPageButton('›', page + 1, LABELS.nextPage, 'is-next'));
  return pagination;
}

/**
 * "{count} productos encontrados" (Results Text row), or Results Text One for a single result
 * when the table has it; nothing without Results Text.
 * @param {Element} count The count element
 * @param {Object} texts settings.texts (results, resultsOne)
 * @param {number|null} totalItems null while loading
 */
function renderResultsCount(count, texts, totalItems) {
  const template = totalItems === 1 && texts.resultsOne ? texts.resultsOne : texts.results;
  count.textContent = template && totalItems !== null
    ? template.replace('{count}', new Intl.NumberFormat(LOCALE).format(totalItems))
    : '';
}

/**
 * Renders the phones and the pagination, or the empty message when there is nothing to show.
 * @param {Object} catalog Elements and state of this instance
 * @param {Object[]} phones Normalised phones
 * @param {{totalItems: number, totalPages: number}} pageInfo
 */
function renderCatalogResults(catalog, phones, pageInfo) {
  const { results, settings, state } = catalog;
  results.removeAttribute('aria-busy');
  renderResultsCount(catalog.count, settings.texts, pageInfo.totalItems);
  if (!phones.length) {
    results.replaceChildren(buildEmptyListMessage({
      icon: settings.messages.emptyListIcon,
      title: settings.messages.emptyListTitle,
      description: settings.messages.emptyListDescription,
    }));
    return;
  }
  const list = createElementWithClass('div', 'product-catalog-list row row-gutter-16 row-gutter-y-16');
  list.setAttribute('role', 'list');
  if (settings.texts.title) list.setAttribute('aria-label', settings.texts.title);
  list.append(...phones.map((phone) => buildPhoneCard(phone, settings)));
  const grid = createElementWithClass('div', 'product-catalog-grid container-fluid');
  grid.append(list);
  const pagination = buildPagination(state.page, pageInfo.totalPages, (page) => {
    state.page = page;
    // eslint-disable-next-line no-use-before-define
    searchPhones(catalog);
    catalog.toolbar.scrollIntoView({ block: 'start' });
  });
  results.replaceChildren(...[grid, pagination].filter(Boolean));
}

/**
 * Searches with the current selection: the service (POST) or, without Search Endpoint, the
 * internal JSON. A new search cancels the previous one; any error logs it, shows the alert
 * and the empty message.
 * @param {Object} catalog Elements and state of this instance
 */
async function searchPhones(catalog) {
  const { results, settings, state } = catalog;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  results.setAttribute('aria-busy', 'true');
  results.replaceChildren(buildPhonesSkeleton());
  renderResultsCount(catalog.count, settings.texts, null);

  if (!settings.searchEndpoint) {
    const { phones, totalItems, totalPages } = searchFallbackPhones(state, settings);
    renderCatalogResults(catalog, phones, { totalItems, totalPages });
    return;
  }
  try {
    const response = await post(
      settings.searchEndpoint,
      buildSearchRequest(state, settings),
      { signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    const rawPhones = Array.isArray(response?.data) ? response.data : response?.data?.products;
    if (!Array.isArray(rawPhones)) throw new Error('Unexpected response: data is not a list');
    const phones = normalizePhones(rawPhones, settings.linkTemplate);
    const pagination = response.pagination || response.data?.pagination || {};
    const totalItems = toNumberOrNull(pagination.totalItems) ?? phones.length;
    const totalPages = toNumberOrNull(pagination.totalPages)
      ?? Math.max(1, Math.ceil(totalItems / settings.pageSize));
    renderCatalogResults(catalog, phones, { totalItems, totalPages });
  } catch (error) {
    if (controller.signal.aborted) return; // replaced by a newer search
    // eslint-disable-next-line no-console
    console.error('[product-catalog] Could not load phones from', settings.searchEndpoint, error);
    if (!state.isAlertShown) showToast(settings.messages.errorResponseMessage, settings.alert);
    state.isAlertShown = false;
    renderCatalogResults(catalog, [], { totalItems: 0, totalPages: 0 });
  }
}

/**
 * Opens or closes the filters panel (only visible as a panel on mobile, by CSS); while it is
 * open the page does not scroll behind it. Focus goes to the panel and back to the toggle.
 * @param {Object} catalog Elements of this instance
 * @param {boolean} isOpen
 */
function toggleFiltersPanel(catalog, isOpen) {
  const { filters, toggle } = catalog;
  if (filters.classList.contains('is-open') === isOpen) return;
  filters.classList.toggle('is-open', isOpen);
  toggle.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('has-product-catalog-filters-open', isOpen);
  if (isOpen) filters.querySelector('.product-catalog-filters-close')?.focus();
  else toggle.focus();
}

/**
 * Number of active filters, shown on the mobile toggle ("Filtros 2").
 * @param {Object} catalog Elements and state of this instance
 */
function renderActiveFiltersCount(catalog) {
  const { state, toggle } = catalog;
  const { brands, os, storage } = state.selected;
  const active = brands.size + os.size + storage.size
    + (state.maxPrice < state.filters.priceRange.max ? 1 : 0);
  toggle.querySelector('.product-catalog-filters-toggle-badge').textContent = active ? String(active) : '';
}

/**
 * The filters box: title (+ close button for the mobile panel), the checkbox groups, the
 * price range and, for the mobile panel, the "Ver resultados" button. Any change goes back
 * to page 1 and searches again.
 * @param {Object} catalog Elements and state of this instance
 */
function renderFiltersPanel(catalog) {
  const {
    filters, settings, state, idPrefix,
  } = catalog;
  const { texts } = settings;
  const onFiltersChange = () => {
    state.page = 1;
    renderActiveFiltersCount(catalog);
    searchPhones(catalog);
  };

  const header = createElementWithClass('div', 'product-catalog-filters-header');
  if (texts.filtersTitle) {
    const title = createElementWithClass('div', 'product-catalog-filters-title', texts.filtersTitle);
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '2');
    header.append(title);
  }
  const close = createElementWithClass('button', 'product-catalog-filters-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', LABELS.closeFilters);
  close.addEventListener('click', () => toggleFiltersPanel(catalog, false));
  header.append(close);

  const groups = createElementWithClass('div', 'product-catalog-filters-body');
  groups.append(...[
    buildCheckboxGroup(texts.brandLabel, state.filters.brands, state.selected.brands, onFiltersChange, `${idPrefix}-brands`),
    buildCheckboxGroup(texts.osLabel, state.filters.operatingSystems, state.selected.os, onFiltersChange, `${idPrefix}-os`),
    buildCheckboxGroup(texts.storageLabel, state.filters.storages, state.selected.storage, onFiltersChange, `${idPrefix}-storage`),
    buildPriceGroup(state, texts.priceLabel, onFiltersChange, `${idPrefix}-price`),
  ].filter(Boolean));

  const content = [header, groups];
  if (texts.apply) {
    const footer = createElementWithClass('div', 'product-catalog-filters-footer');
    const apply = createElementWithClass('button', 'product-catalog-filters-apply', texts.apply);
    apply.type = 'button';
    apply.addEventListener('click', () => toggleFiltersPanel(catalog, false));
    footer.append(apply);
    content.push(footer);
  }
  filters.replaceChildren(...content);
  renderActiveFiltersCount(catalog);
}

/**
 * Loads the filter options; on any error logs it, shows the alert and uses FALLBACK_FILTERS.
 * @param {Object} catalog Elements and state of this instance
 * @returns {Promise<Object>} the normalised filters
 */
async function loadFiltersFromService(catalog) {
  const { settings, state } = catalog;
  if (!settings.filtersEndpoint) return normalizeFilters(FALLBACK_FILTERS);
  try {
    const response = await get(settings.filtersEndpoint);
    if (!response?.data || typeof response.data !== 'object') {
      throw new Error('Unexpected response: data is missing');
    }
    return normalizeFilters(response.data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[product-catalog] Could not load filters from', settings.filtersEndpoint, error);
    showToast(settings.messages.errorResponseMessage, settings.alert);
    state.isAlertShown = true; // one alert when the first search fails too
    return normalizeFilters(FALLBACK_FILTERS);
  }
}

/**
 * Filters first (their price range starts the search), then the first search.
 * @param {Object} catalog Elements and state of this instance
 */
async function startCatalog(catalog) {
  const { state } = catalog;
  state.filters = await loadFiltersFromService(catalog);
  state.maxPrice = state.filters.priceRange.max;
  renderFiltersPanel(catalog);
  await searchPhones(catalog);
  state.isAlertShown = false;
}

/**
 * Product Catalog: filters + phones list fed by two services (or the internal JSON).
 * The block name gives the main .product-catalog class that scopes every style.
 * @param {Element} block The product-catalog block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  const settings = readCatalogSettings(block);
  catalogCount += 1;
  const idPrefix = `product-catalog-${catalogCount}`;

  const {
    toolbar, count, toggle, sort,
  } = buildCatalogToolbar(settings, idPrefix);
  const { layout, filters, results } = buildCatalogLayout(settings, idPrefix);
  block.replaceChildren(toolbar, layout);

  const catalog = {
    settings,
    idPrefix,
    toolbar,
    count,
    toggle,
    filters,
    results,
    state: {
      filters: normalizeFilters(FALLBACK_FILTERS),
      selected: { brands: new Set(), os: new Set(), storage: new Set() },
      maxPrice: FALLBACK_FILTERS.priceRange.max,
      sortBy: SORT_OPTIONS[0].value,
      page: 1,
      controller: null,
      isAlertShown: false,
    },
  };

  sort.addEventListener('change', () => {
    catalog.state.sortBy = sort.value;
    catalog.state.page = 1;
    searchPhones(catalog);
  });
  toggle.addEventListener('click', () => toggleFiltersPanel(catalog, !filters.classList.contains('is-open')));
  filters.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') toggleFiltersPanel(catalog, false);
  });

  startCatalog(catalog);
}
