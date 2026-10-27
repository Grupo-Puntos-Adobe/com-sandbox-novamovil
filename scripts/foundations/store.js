/*
 * Store (foundations): global variables for the whole site, like the state of React.
 * head.html loads this file on every page, so it is always listening.
 *
 *   STORE                          the ONLY variables that exist (declare new ones here first)
 *   store.get('breadcrumb.name')   one variable · store.get('breadcrumb') a slice · store.get() all
 *   store.set('breadcrumb.name', 'iPhone')   one · store.set('breadcrumb', { name, brand }) several
 *   store.reset('breadcrumb.name') one · store.reset('breadcrumb') a slice · store.reset() all
 *   store.subscribe('breadcrumb', (breadcrumb) => …)   optional: logic when a value changes
 *
 * Automatic text: any text of the page with a mark {store.slice.variable} ("Detalle de
 * {store.breadcrumb.name}"), in any block or authored text, is filled with its value and filled
 * again on every set / reset. While a mark has no value its element waits hidden
 * (data-store-pending, styles/foundations/store.css). Only text is changed, never HTML, and
 * the texts of a block are filled once the block finished loading (it reads its table first).
 * Blocks only call store.set(); to show a value as text they need nothing. Marks without
 * "store." ({id}, {count}) belong to the block that paints them: the store never touches them.
 *
 * The store starts empty on every page (each navigation loads the page again).
 * Something that is not declared in STORE is rejected with an error and nothing is stored.
 * Guide: scripts/foundations/README.md (store.js).
 */

// the variables of the site, by slice, with their initial (empty) values
const STORE = {
  // the dynamic levels of the breadcrumb (set by the block that knows them, e.g. product-detail)
  breadcrumb: {
    name: '', // {store.breadcrumb.name}: the current page (e.g. the product)
    brand: '', // {store.breadcrumb.brand}: e.g. "Apple"
  },
  // the user of the session, filled ONLY by session.js (login, guest, every page start) and
  // emptied when the session ends; never the token
  user: {
    userId: '',
    firstName: '', // {store.user.firstName}
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    verified: false,
    sessionId: '',
    isGuest: false, // true for "Continuar como invitado" (userId 'guest', firstName 'Invitado')
  },
};

const state = structuredClone(STORE);
const listeners = new Set();
// text nodes of the page with marks → their authored text (with the marks)
const boundTexts = new Map();
// a mark of the store in a text: {store.slice.variable} (marks without "store." belong to the
// block that paints them, like {id} or {count}, and are never touched)
const MARK = /\{store\.([a-z][\w-]*)\.([a-z][\w-]*)\}/gi;
const STORE_CSS_URL = new URL('../../styles/foundations/store.css', import.meta.url).href;

/**
 * Slice and variable of a path, after checking that they are declared in STORE.
 * @param {string} [path] 'breadcrumb.name', 'breadcrumb' or nothing (the whole store)
 * @returns {[string|undefined, string|undefined]}
 */
function readPath(path) {
  if (!path) {
    return [undefined, undefined];
  }
  const [slice, variable, ...rest] = path.split('.');
  if (!STORE[slice] || rest.length || (variable !== undefined && !(variable in STORE[slice]))) {
    throw new Error(`store: "${path}" does not exist (declared: ${JSON.stringify(STORE)})`);
  }
  return [slice, variable];
}

/**
 * One variable, a slice or the whole store (a copy).
 * @param {string} [path]
 * @returns {*}
 */
function get(path) {
  const [slice, variable] = readPath(path);
  if (!slice) {
    return structuredClone(state);
  }
  return structuredClone(variable ? state[slice][variable] : state[slice]);
}

/**
 * The text with its marks replaced by their values; '' while a mark has no value.
 * @param {string} text
 * @returns {string}
 */
function fillMarks(text) {
  let missing = false;
  const filled = text.replace(MARK, (mark, slice, variable) => {
    if (!STORE[slice] || !(variable in STORE[slice])) {
      return mark; // not a variable of the store: plain text
    }
    const value = state[slice][variable];
    missing = missing || value === '' || value === null || value === undefined;
    return String(value);
  });
  return missing ? '' : filled;
}

/**
 * Paints every text of the page that has marks, and tells the subscribers.
 */
function update() {
  boundTexts.forEach((template, node) => {
    if (!node.isConnected) {
      boundTexts.delete(node);
      return;
    }
    const filled = fillMarks(template);
    node.nodeValue = filled;
    node.parentElement?.toggleAttribute('data-store-pending', !filled);
  });
  listeners.forEach((listener) => listener());
}

/**
 * Changes one variable or several variables of a slice. Everything is checked first.
 * @param {string} path 'breadcrumb.name' or 'breadcrumb'
 * @param {*} value A value, or an object with variables of the slice
 */
function set(path, value) {
  const [slice, variable] = readPath(path);
  if (!slice) {
    throw new Error('store: set() needs a slice or a variable, e.g. set(\'breadcrumb.name\', …)');
  }
  const changes = variable ? { [variable]: value } : value;
  Object.keys(changes || {}).forEach((name) => readPath(`${slice}.${name}`));
  Object.assign(state[slice], changes);
  update();
}

/**
 * Back to the initial values of STORE: one variable, a slice or the whole store.
 * @param {string} [path]
 */
function reset(path) {
  const [slice, variable] = readPath(path);
  if (!slice) {
    Object.assign(state, structuredClone(STORE));
  } else if (variable) {
    state[slice][variable] = STORE[slice][variable];
  } else {
    state[slice] = structuredClone(STORE[slice]);
  }
  update();
}

/**
 * Optional: calls callback with get(path) now and every time the store changes.
 * @param {string|Function} path 'breadcrumb.name', 'breadcrumb', or the callback (whole store)
 * @param {Function} [callback]
 * @returns {Function} Stops listening
 */
function subscribe(path, callback) {
  const [watched, onChange] = typeof path === 'function' ? [undefined, path] : [path, callback];
  readPath(watched);
  let last = JSON.stringify(get(watched));
  const listener = () => {
    const now = JSON.stringify(get(watched));
    if (now !== last) {
      last = now;
      onChange(get(watched));
    }
  };
  listeners.add(listener);
  onChange(get(watched));
  return () => listeners.delete(listener);
}

/**
 * True when a text can be filled now: outside blocks, or inside a block that finished loading.
 * The table of a block is never touched before the block reads it (a block that is still a
 * raw table — main > div > div.blockname — or still loading waits).
 * @param {Text} node
 * @returns {boolean}
 */
function isReady(node) {
  const element = node.parentElement;
  if (!element) {
    return false;
  }
  const block = element.closest('.block');
  if (block) {
    return block.dataset.blockStatus === 'loaded';
  }
  return !element.closest('main > div > div[class]:not([class$="-wrapper"])');
}

/**
 * Finds the texts with marks inside an element and paints them.
 * @param {Node} root
 */
function bindTexts(root) {
  const texts = [];
  if (root.nodeType === Node.TEXT_NODE) {
    texts.push(root);
  } else {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      texts.push(node);
    }
  }
  let changed = false;
  texts.forEach((node) => {
    MARK.lastIndex = 0;
    if (!boundTexts.has(node) && MARK.test(node.nodeValue) && isReady(node)) {
      boundTexts.set(node, node.nodeValue);
      changed = true;
    }
  });
  if (changed) {
    update();
  }
}

/**
 * Start: the CSS of the waiting marks, the texts already on the page and every new one.
 */
function initStore() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STORE_CSS_URL;
  document.head.append(link);
  bindTexts(document.body);
  new MutationObserver((mutations) => {
    mutations.forEach(({ type, target, addedNodes }) => {
      // a block that finished loading: its texts can be filled now
      if (type === 'attributes' && target.dataset.blockStatus === 'loaded') {
        bindTexts(target);
      }
      addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          bindTexts(node);
        }
      });
    });
  }).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['data-block-status'],
  });
}

initStore();

export const store = {
  get, set, reset, subscribe,
};

export default store;
