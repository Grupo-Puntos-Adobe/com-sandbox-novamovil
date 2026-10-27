/*
 * Store (foundations): global variables that any block can write, read at any time and listen
 * to, like a simple Redux (one state, get / set / subscribe) without reducers.
 *
 * The state is split in slices ("apartados"), declared ONLY in STORE_SLICES below. Each slice
 * says how long it lives:
 *   keep: 'page'      in memory: built on the page where it is used, gone when you navigate
 *   keep: 'session'   in sessionStorage: still there on the next pages, gone when the tab
 *                     closes (loaded again when a page opens)
 *
 *   import { store } from '../../scripts/foundations/store.js';
 *
 *   store.set('breadcrumb.name', 'Apple iPhone 15 Pro')   one value of a slice
 *   store.set('breadcrumb', { name, brand })               several values of a slice at once
 *   store.get('breadcrumb.name')                           'Apple iPhone 15 Pro'
 *   store.get('breadcrumb')                                { name: 'Apple iPhone 15 Pro', … }
 *   store.getState()                                       the whole state (a copy)
 *   store.subscribe('breadcrumb', (breadcrumb) => …)       called now and on every change of
 *                                                          the slice (or of one value:
 *                                                          'breadcrumb.name'); returns a
 *                                                          function to stop listening
 *   store.fill('Detalle de {breadcrumb.name}')             Drive text with marks {slice.value}:
 *                                                          'Detalle de Apple iPhone 15 Pro';
 *                                                          without marks the text comes back as
 *                                                          authored; a mark without its value
 *                                                          yet → ''
 *   store.has('Detalle de {breadcrumb.name}')              true when the text has a mark
 *
 * Today: product-detail sets breadcrumb.name when the product arrives; breadcrumb shows it in
 * its "{breadcrumb.name}" level. Guide: scripts/foundations/README.md (store.js).
 */

// the slices of the state: how long each one lives and its initial values
const STORE_SLICES = {
  // Breadcrumb: one value per dynamic level, built on the page of the breadcrumb
  breadcrumb: { keep: 'page', initial: { name: '', brand: '' } },
  // user: { keep: 'session', initial: null },   ← later: filled by session.js
};
const STORAGE_PREFIX = 'novamovil-store:';
// a mark of a Drive text: {slice.value}
const MARK = /\{([a-z][\w-]*)\.([a-z][\w-]*)\}/gi;

const state = {};
const listeners = new Set();

/**
 * Copy of a value, so nobody changes the state without set().
 * @param {*} value
 * @returns {*}
 */
const copy = (value) => (value && typeof value === 'object' ? structuredClone(value) : value);

/**
 * The slice and the value name of a path: 'breadcrumb.name' → ['breadcrumb', 'name'].
 * @param {string} path
 * @returns {[string, string|undefined]}
 */
function splitPath(path) {
  const [slice, key] = String(path || '').split('.');
  if (!STORE_SLICES[slice]) {
    throw new Error(`store: unknown slice "${slice}" (declare it in STORE_SLICES of store.js)`);
  }
  return [slice, key];
}

/**
 * Saves a slice that lives for the session (sessionStorage; never throws).
 * @param {string} slice
 */
function persistSlice(slice) {
  if (STORE_SLICES[slice].keep !== 'session') {
    return;
  }
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${slice}`, JSON.stringify(state[slice]));
  } catch {
    // storage blocked: the slice lives only on this page
  }
}

/**
 * Initial state: the initial values of every slice, and the saved ones of the session slices.
 */
function loadState() {
  Object.entries(STORE_SLICES).forEach(([slice, { keep, initial }]) => {
    state[slice] = copy(initial);
    if (keep !== 'session') {
      return;
    }
    try {
      const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${slice}`);
      if (saved !== null) {
        state[slice] = JSON.parse(saved);
      }
    } catch {
      // nothing saved or storage blocked: the initial values
    }
  });
}

/**
 * A slice or one of its values.
 * @param {string} path 'breadcrumb' or 'breadcrumb.name'
 * @returns {*} A copy ('' for a value that does not exist)
 */
function get(path) {
  const [slice, key] = splitPath(path);
  if (key === undefined) {
    return copy(state[slice]);
  }
  return copy(state[slice]?.[key] ?? '');
}

/**
 * Changes a value, or several values of a slice at once, and tells the subscribers.
 * @param {string} path 'breadcrumb.name' (one value) or 'breadcrumb' (an object: its values are
 *   merged into the slice; null empties it)
 * @param {*} value
 */
function set(path, value) {
  const [slice, key] = splitPath(path);
  const stored = typeof value === 'string' ? value.trim() : copy(value);
  if (key !== undefined) {
    state[slice] = { ...(state[slice] || {}), [key]: stored };
  } else if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    state[slice] = { ...(state[slice] || {}), ...stored };
  } else {
    state[slice] = stored;
  }
  persistSlice(slice);
  listeners.forEach((listener) => listener(slice, key));
}

/**
 * Calls callback with the value of path now and every time it changes.
 * @param {string} path 'breadcrumb' (any value of the slice) or 'breadcrumb.name' (only that one)
 * @param {Function} callback Receives get(path)
 * @returns {Function} Stops listening
 */
function subscribe(path, callback) {
  const [slice, key] = splitPath(path);
  const listener = (changedSlice, changedKey) => {
    const sameSlice = changedSlice === slice;
    const sameValue = key === undefined || changedKey === undefined || changedKey === key;
    if (sameSlice && sameValue) {
      callback(get(path));
    }
  };
  listeners.add(listener);
  callback(get(path));
  return () => listeners.delete(listener);
}

/**
 * The marks of a text that belong to a declared slice.
 * @param {string} text
 * @returns {{mark: string, path: string}[]}
 */
function readMarks(text) {
  return [...String(text || '').matchAll(MARK)]
    .filter(([, slice]) => STORE_SLICES[slice])
    .map(([mark, slice, key]) => ({ mark, path: `${slice}.${key}` }));
}

/**
 * True when a Drive text has a mark of the store ({breadcrumb.name}…).
 * @param {string} text
 * @returns {boolean}
 */
function has(text) {
  return readMarks(text).length > 0;
}

/**
 * The Drive text with every mark replaced by its value.
 * @param {string} text Authored text, e.g. 'Detalle de {breadcrumb.name}'
 * @returns {string} '' while a mark has no value yet; the text as authored without marks
 */
function fill(text) {
  const marks = readMarks(text);
  const values = marks.map(({ path }) => get(path));
  if (values.some((value) => value === '' || value === null || value === undefined)) {
    return '';
  }
  return marks
    .reduce((result, { mark }, index) => result.split(mark).join(String(values[index])), String(text || ''))
    .trim();
}

/**
 * The whole state (a copy).
 * @returns {Object}
 */
function getState() {
  return copy(state);
}

loadState();

export const store = {
  get, set, subscribe, getState, fill, has,
};

export default store;
