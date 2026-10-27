/*
 * Page context: values a block learns at run time (for example from a service) that other
 * blocks of the same page need, without importing each other. Any value, not only names.
 *
 * Each value has its own key in PAGE_CONTEXT, grouped by section ("apartado"). The mark an
 * author writes in Drive is the key between braces: {breadcrumb-name}. To transmit something
 * new, add ONE key to PAGE_CONTEXT; the functions do not change.
 *
 *   setPageContext(key, value)      the block that KNOWS the value stores it (and tells the page)
 *   getPageContext(key)             the stored value, or ''
 *   onPageContext(key, callback)    callback(value) now (if there is one) and on every change, so
 *                                   it does not matter which block loaded first
 *   fillPageContext(text)           the marks replaced by their values:
 *                                   'Detalle de {breadcrumb-name}' → 'Detalle de Apple iPhone 15'
 *                                   (a text without marks comes back as authored; a mark without
 *                                   its value yet → '')
 *   hasPageContext(text)            true when the text has a mark of PAGE_CONTEXT
 *   PAGE_CONTEXT_EVENT              on document, detail = { key, value }
 *
 * Today: product-detail sets BREADCRUMB_NAME when the product arrives; breadcrumb shows it in
 * its "{breadcrumb-name}" level.
 */

// the values that can be transmitted, by section; the Drive mark is {value of the key}
export const PAGE_CONTEXT = {
  // Breadcrumb: one value per dynamic level
  BREADCRUMB_NAME: 'breadcrumb-name', // {breadcrumb-name}: the current page (e.g. the product)
  // BREADCRUMB_BRAND: 'breadcrumb-brand', // {breadcrumb-brand}: e.g. "Apple" (when needed)
};

export const PAGE_CONTEXT_EVENT = 'page-context:change';

const values = new Map();
const KNOWN_KEYS = () => Object.values(PAGE_CONTEXT);
const toMark = (key) => `{${key}}`;

/**
 * Stores the value of a key and tells the blocks that wait for it.
 * @param {string} key One of PAGE_CONTEXT
 * @param {*} value e.g. 'Apple iPhone 15 Pro'
 */
export function setPageContext(key, value) {
  const stored = typeof value === 'string' ? value.trim() : value;
  values.set(key, stored);
  document.dispatchEvent(new CustomEvent(PAGE_CONTEXT_EVENT, { detail: { key, value: stored } }));
}

/**
 * The value stored for a key, or '' while no block has set it.
 * @param {string} key One of PAGE_CONTEXT
 * @returns {*}
 */
export function getPageContext(key) {
  return values.has(key) ? values.get(key) : '';
}

/**
 * Calls callback(value) now when the key already has a value, and every time it changes.
 * @param {string} key One of PAGE_CONTEXT
 * @param {Function} callback Receives the value
 * @returns {Function} Stops listening
 */
export function onPageContext(key, callback) {
  const listener = (event) => {
    if (event.detail.key === key) {
      callback(event.detail.value);
    }
  };
  if (values.has(key)) {
    callback(values.get(key));
  }
  document.addEventListener(PAGE_CONTEXT_EVENT, listener);
  return () => document.removeEventListener(PAGE_CONTEXT_EVENT, listener);
}

/**
 * The keys of PAGE_CONTEXT whose mark is in the text.
 * @param {string} text Authored text
 * @returns {string[]}
 */
function readContextKeys(text) {
  const value = String(text || '');
  return KNOWN_KEYS().filter((key) => value.includes(toMark(key)));
}

/**
 * True when an authored text has a mark of PAGE_CONTEXT ({breadcrumb-name}…).
 * @param {string} text
 * @returns {boolean}
 */
export function hasPageContext(text) {
  return readContextKeys(text).length > 0;
}

/**
 * The authored text with every mark replaced by its value: 'Detalle de {breadcrumb-name}' →
 * 'Detalle de Apple iPhone 15 Pro'. Without marks it comes back as authored; when a mark has
 * no value yet → '' (do not paint it until onPageContext tells it arrived).
 * @param {string} text Authored text
 * @returns {string}
 */
export function fillPageContext(text) {
  const keys = readContextKeys(text);
  const missing = keys.some((key) => getPageContext(key) === '' || getPageContext(key) == null);
  if (missing) {
    return '';
  }
  return keys
    .reduce((result, key) => result.split(toMark(key)).join(String(getPageContext(key))), String(text || ''))
    .trim();
}
