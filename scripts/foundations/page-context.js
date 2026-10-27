/*
 * Page context: values a block learns at run time (for example from a service) that other
 * blocks of the same page need, without importing each other.
 *
 * Today: the name of the current page, set by product-detail when the product arrives and
 * used by breadcrumb for its "{dynamic-name}" level.
 *   setCurrentPageName('Apple iPhone 15 Pro')   stores it and fires CURRENT_PAGE_NAME_EVENT
 *   getCurrentPageName()                        the stored name ('' until it is set)
 * A block that loads after the name was set reads it with getCurrentPageName(); one that
 * loads before listens to CURRENT_PAGE_NAME_EVENT on document.
 *
 * Dynamic text in Drive, for ANY block: the author writes {dynamic-name} where the name goes
 * ("Detalle de {dynamic-name}"); without the mark the text is shown as authored. {product}
 * (the first name of the mark) is still accepted.
 *   hasDynamicName(text)           true when the text has the mark
 *   fillDynamicName(text, name)    the mark replaced by the name ('' while there is no name)
 */

export const CURRENT_PAGE_NAME_EVENT = 'page-context:current-page-name';
// mark of an authored text that takes the page name; {product} is its older name
export const DYNAMIC_NAME_PLACEHOLDER = '{dynamic-name}';
const DYNAMIC_NAME_MARKS = [DYNAMIC_NAME_PLACEHOLDER, '{product}'];

let currentPageName = '';

/**
 * Stores the name of the current page and tells the blocks that wait for it.
 * @param {string} name e.g. 'Apple iPhone 15 Pro'
 */
export function setCurrentPageName(name) {
  currentPageName = String(name || '').trim();
  const detail = { name: currentPageName };
  document.dispatchEvent(new CustomEvent(CURRENT_PAGE_NAME_EVENT, { detail }));
}

/**
 * The name of the current page, or '' while no block has set it.
 * @returns {string}
 */
export function getCurrentPageName() {
  return currentPageName;
}

/**
 * True when an authored text has the dynamic name mark ({dynamic-name} or {product}).
 * @param {string} text
 * @returns {boolean}
 */
export function hasDynamicName(text) {
  return DYNAMIC_NAME_MARKS.some((mark) => String(text || '').includes(mark));
}

/**
 * The authored text with the mark replaced by the page name: 'Detalle de {dynamic-name}' →
 * 'Detalle de Apple iPhone 15 Pro'. A text without the mark comes back as authored; with the
 * mark and no name yet → '' (do not paint it until CURRENT_PAGE_NAME_EVENT).
 * @param {string} text Authored text
 * @param {string} [name=getCurrentPageName()] The name to put
 * @returns {string}
 */
export function fillDynamicName(text, name = getCurrentPageName()) {
  const value = String(text || '');
  if (!hasDynamicName(value)) {
    return value.trim();
  }
  if (!name) {
    return '';
  }
  return DYNAMIC_NAME_MARKS.reduce((result, mark) => result.split(mark).join(name), value).trim();
}
