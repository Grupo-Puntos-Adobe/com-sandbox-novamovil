/*
 * Store (foundations): global variables that any block can write, read at any time and listen
 * to, like a simple Redux (one state, get / set / subscribe) without reducers.
 *
 * STRICT: only the variables declared in STORE_SLICES below exist. A slice, a variable or a
 * type that is not declared is rejected with an error and nothing is stored, so the store never
 * fills up with values nobody planned. To store something new, declare it first.
 *
 * Each slice ("apartado") declares its variables (name → initial value; the initial value also
 * fixes the type) and how long it lives:
 *   keep: 'page'      in memory: built on the page where it is used, gone when you navigate
 *   keep: 'session'   in sessionStorage: still there on the next pages, gone when the tab
 *                     closes (loaded again when a page opens)
 *
 *   import { store } from '../../scripts/foundations/store.js';
 *
 *   store.set('breadcrumb.name', 'Apple iPhone 15 Pro')   one variable
 *   store.set('breadcrumb', { name, brand })               several variables of a slice at once
 *   store.get('breadcrumb.name')                           'Apple iPhone 15 Pro'
 *   store.get('breadcrumb')                                { name: 'Apple iPhone 15 Pro', … }
 *   store.reset('breadcrumb')                              back to the initial values
 *   store.getState()                                       the whole state (a copy)
 *   store.subscribe('breadcrumb', (breadcrumb) => …)       called now and on every change of
 *                                                          the slice (or of one variable:
 *                                                          'breadcrumb.name'); returns a
 *                                                          function to stop listening
 *   store.fill('Detalle de {breadcrumb.name}')             Drive text with marks {slice.variable}:
 *                                                          'Detalle de Apple iPhone 15 Pro';
 *                                                          without marks the text comes back as
 *                                                          authored; a mark without its value
 *                                                          yet → ''
 *   store.has('Detalle de {breadcrumb.name}')              true when the text has a mark
 *
 * Today: product-detail sets breadcrumb.name when the product arrives; breadcrumb shows it in
 * its "{breadcrumb.name}" level. Guide: scripts/foundations/README.md (store.js).
 */

// the ONLY variables of the store, by slice: how long the slice lives and each variable with its
// initial value (which also fixes its type)
const STORE_SLICES = {
  // Breadcrumb: one variable per dynamic level, built on the page of the breadcrumb
  breadcrumb: {
    keep: 'page',
    variables: {
      name: '', // {breadcrumb.name}: the current page (e.g. the product)
      brand: '', // {breadcrumb.brand}: e.g. "Apple"
    },
  },
};
const STORAGE_PREFIX = 'novamovil-store:';
// a mark of a Drive text: {slice.variable}
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
 * The declared variables of a slice ({ name: '', brand: '' }).
 * @param {string} slice
 * @returns {Object}
 */
const variablesOf = (slice) => STORE_SLICES[slice].variables;

/**
 * The slice and the variable of a path, after checking that both are declared:
 * 'breadcrumb.name' → ['breadcrumb', 'name'].
 * @param {string} path
 * @returns {[string, string|undefined]}
 * @throws {Error} The slice or the variable is not declared in STORE_SLICES
 */
function readPath(path) {
  const [slice, variable, ...rest] = String(path || '').split('.');
  if (!STORE_SLICES[slice]) {
    throw new Error(`store: "${slice}" is not a slice (declared: ${Object.keys(STORE_SLICES).join(', ')})`);
  }
  if (rest.length || (variable !== undefined && !(variable in variablesOf(slice)))) {
    const declared = Object.keys(variablesOf(slice)).join(', ');
    throw new Error(`store: "${path}" is not declared (variables of ${slice}: ${declared})`);
  }
  return [slice, variable];
}

/**
 * Checks that a value has the type of the declared variable (its initial value).
 * @param {string} slice
 * @param {string} variable
 * @param {*} value
 * @throws {Error} Different type
 */
function checkType(slice, variable, value) {
  const expected = typeof variablesOf(slice)[variable];
  const received = typeof value;
  if (received !== expected) {
    throw new Error(`store: ${slice}.${variable} is a ${expected}, not a ${received}`);
  }
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
 * Initial state: the initial values of every slice and, for the session slices, the saved
 * values of the declared variables only (anything else that was saved is ignored).
 */
function loadState() {
  Object.entries(STORE_SLICES).forEach(([slice, { keep, variables }]) => {
    state[slice] = copy(variables);
    if (keep !== 'session') {
      return;
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem(`${STORAGE_PREFIX}${slice}`) || 'null');
      Object.keys(variables).forEach((variable) => {
        if (saved && typeof saved[variable] === typeof variables[variable]) {
          state[slice][variable] = saved[variable];
        }
      });
    } catch {
      // nothing saved or storage blocked: the initial values
    }
  });
}

/**
 * A declared variable, or a whole slice.
 * @param {string} path 'breadcrumb.name' or 'breadcrumb'
 * @returns {*} A copy
 * @throws {Error} Not declared
 */
function get(path) {
  const [slice, variable] = readPath(path);
  return copy(variable === undefined ? state[slice] : state[slice][variable]);
}

/**
 * Tells the subscribers that a slice (or one of its variables) changed.
 * @param {string} slice
 * @param {string} [variable]
 */
function notify(slice, variable) {
  persistSlice(slice);
  listeners.forEach((listener) => listener(slice, variable));
}

/**
 * Changes a declared variable, or several variables of a slice at once. Everything is checked
 * first: if one variable is not declared or has another type, nothing is stored.
 * @param {string} path 'breadcrumb.name' (one variable) or 'breadcrumb' (an object with some of
 *   its variables)
 * @param {*} value
 * @throws {Error} Not declared, or a different type
 */
function set(path, value) {
  const [slice, variable] = readPath(path);
  const clean = (item) => (typeof item === 'string' ? item.trim() : copy(item));
  if (variable !== undefined) {
    checkType(slice, variable, value);
    state[slice][variable] = clean(value);
    notify(slice, variable);
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`store: set('${slice}', …) needs an object with variables of ${slice}`);
  }
  Object.entries(value).forEach(([name, item]) => {
    readPath(`${slice}.${name}`);
    checkType(slice, name, item);
  });
  Object.entries(value).forEach(([name, item]) => {
    state[slice][name] = clean(item);
  });
  notify(slice);
}

/**
 * Puts a slice back to its initial values (e.g. when the session ends).
 * @param {string} slice
 */
function reset(slice) {
  const [name] = readPath(slice);
  state[name] = copy(variablesOf(name));
  notify(name);
}

/**
 * Calls callback with the value of path now and every time it changes.
 * @param {string} path 'breadcrumb' (any variable of the slice) or 'breadcrumb.name' (only that
 *   one)
 * @param {Function} callback Receives get(path)
 * @returns {Function} Stops listening
 */
function subscribe(path, callback) {
  const [slice, variable] = readPath(path);
  const listener = (changedSlice, changedVariable) => {
    const sameSlice = changedSlice === slice;
    const sameVariable = variable === undefined || changedVariable === undefined
      || changedVariable === variable;
    if (sameSlice && sameVariable) {
      callback(get(path));
    }
  };
  listeners.add(listener);
  callback(get(path));
  return () => listeners.delete(listener);
}

/**
 * The marks of a text that are declared variables ({breadcrumb.name}); any other {…} is text.
 * @param {string} text
 * @returns {{mark: string, path: string}[]}
 */
function readMarks(text) {
  return [...String(text || '').matchAll(MARK)]
    .filter(([, slice, variable]) => STORE_SLICES[slice] && variable in variablesOf(slice))
    .map(([mark, slice, variable]) => ({ mark, path: `${slice}.${variable}` }));
}

/**
 * True when a Drive text has a mark of a declared variable ({breadcrumb.name}…).
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
  get, set, reset, subscribe, getState, fill, has,
};

export default store;
