/*
 * Page context: values a block learns at run time (for example from a service) that other
 * blocks of the same page need, without importing each other.
 *
 * Today: the name of the current page, set by product-detail when the product arrives and
 * used by breadcrumb for its "{product}" level.
 *   setCurrentPageName('Apple iPhone 15 Pro')   stores it and fires CURRENT_PAGE_NAME_EVENT
 *   getCurrentPageName()                        the stored name ('' until it is set)
 * A block that loads after the name was set reads it with getCurrentPageName(); one that
 * loads before listens to CURRENT_PAGE_NAME_EVENT on document.
 */

export const CURRENT_PAGE_NAME_EVENT = 'page-context:current-page-name';

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
