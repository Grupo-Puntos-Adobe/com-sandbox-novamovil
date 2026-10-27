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
 * Private variables (PRIVATE_VARIABLES, e.g. session.token) are read from JS only: a mark of
 * one is never filled. Never log the store or its "session" slice: it carries the token.
 *
 * The store starts empty on every page (each navigation loads the page again).
 * Something that is not declared in STORE is rejected with an error and nothing is stored.
 * Debug: uncomment the showStoreInConsole() call at the end of this file to see the whole store in
 * the console on every change (keep it commented in the repo).
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
  // who is visiting, filled ONLY by session.js (every page start, login, guest, logout, expiry):
  //   login → isSession true · guest → isGuest true · nobody → both false
  session: {
    isSession: false, // true ONLY with a real login (it has a token); a guest is not a session
    isGuest: false, // true after "Continuar como invitado"
    token: '', // 'Bearer …' for the Authorization header of private calls; '' without a login
  },
};

// variables that a Drive mark can never show (the mark stays hidden and a warning is logged)
const PRIVATE_VARIABLES = ['session.token'];

const state = structuredClone(STORE);
const listeners = new Set();
// text nodes of the page with marks → their authored text (with the marks)
const boundTexts = new Map();
// marks of private variables already reported in the console (once each)
const warnedMarks = new Set();
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
    if (PRIVATE_VARIABLES.includes(`${slice}.${variable}`)) {
      if (!warnedMarks.has(mark)) {
        warnedMarks.add(mark);
        // eslint-disable-next-line no-console
        console.warn(`store: ${mark} is private and is never shown on the page`);
      }
      missing = true;
      return '';
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

// --- debug: showStoreInConsole (start) — safe to delete this whole block ---------------------
/* eslint-disable no-console */
/**
 * Debug only: shows the WHOLE store in the console now and on every change, as one table with
 * every variable declared in STORE (before → after); what changed is marked (✏️). Private
 * variables (session.token) are masked. Turn it on by uncommenting the call below.
 * - Changes made at the same moment (session.js fills "session" and "user" one after the other)
 *   come out together in ONE table.
 * - The last table is kept in sessionStorage, so the first table of the next page (after a
 *   login, a logout or any navigation, when the console is cleared) shows what there was before.
 */
// eslint-disable-next-line no-unused-vars
function showStoreInConsole() {
  const DEBUG_STORAGE_KEY = 'novamovil-store-debug';
  const readRows = (all) => Object.entries(STORE).flatMap(([slice, variables]) => Object
    .keys(variables)
    .map((variable) => {
      const path = `${slice}.${variable}`;
      const value = all[slice][variable];
      return [path, PRIVATE_VARIABLES.includes(path) && value ? '••• (privado)' : value];
    }));
  // the last table of the previous page (the store itself starts empty on every page)
  let previous = null;
  try {
    previous = JSON.parse(sessionStorage.getItem(DEBUG_STORAGE_KEY) || 'null');
  } catch {
    previous = null;
  }
  let isPageStart = true;
  let isPending = false;

  const print = () => {
    isPending = false;
    const rows = readRows(get());
    const before = previous && Object.fromEntries(previous);
    const changed = before
      ? rows.filter(([path, value]) => JSON.stringify(value) !== JSON.stringify(before[path]))
        .map(([path]) => path)
      : [];
    if (!isPageStart && !changed.length) {
      return;
    }
    const time = new Date().toLocaleTimeString();
    // DevTools gives every column the same width: the ✏️ goes next to the name, not in a column
    const table = Object.fromEntries(rows.map(([path, value]) => {
      if (!before) {
        return [path, { después: value }];
      }
      const name = changed.includes(path) ? `✏️ ${path}` : path;
      return [name, { antes: before[path], después: value }];
    }));
    let title = `store · cambió ${changed.join(', ')} (${time})`;
    if (isPageStart) {
      title = before
        ? `store · inicio de ${window.location.pathname}, antes = página anterior (${time})`
        : `store · inicio de ${window.location.pathname} (${time})`;
    }
    console.group(title);
    console.table(table);
    console.groupEnd();
    previous = rows;
    isPageStart = false;
    try {
      sessionStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // storage blocked: the next page starts without "antes"
    }
  };

  // several set / reset in a row → one table, once they all finished
  subscribe(() => {
    if (!isPending) {
      isPending = true;
      queueMicrotask(print);
    }
  });
}
/* eslint-enable no-console */

// uncomment to see the store in the console; comment it again before pushing
showStoreInConsole();
// --- debug: showStoreInConsole (end) ---------------------------------------------------------

export const store = {
  get, set, reset, subscribe,
};

export default store;
