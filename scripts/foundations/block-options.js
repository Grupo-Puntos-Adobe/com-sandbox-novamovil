/*
 * Optional authoring rows for the NovaMóvil blocks. Opt-in: a block calls
 * applyBlockOptions(block) as the FIRST line of its decorate(); template blocks (cards,
 * columns, hero…) do not call it and are left untouched.
 * The page Metadata rule (Session / Redirect To) is not here: it runs on every page, with or
 * without blocks, from scripts/foundations/session.js (loaded first by head.html). The blocks
 * read the store (filled by session.js):
 *   session.isSession  is there a session? (only with a login; a guest is not one)
 *   user.type          what type of user: 'user' | 'guest' | '' (nobody)
 *
 *   | Styles    | padding-top: 0; padding-left: 20px |  -> inline styles on the block (main class)
 *   | Classname | dark compact                       |  -> extra classes on the block
 *   | Session   | true | false                       |  -> the block depends on the session
 *
 * Session (the whole block and its wrapper; store session.isSession, a guest is not a session):
 *   true  → shown only WITH a session (hidden without one and for a guest)
 *   false → shown only WITHOUT a session (also for a guest, e.g. an "Iniciar sesión" button)
 *   empty or no row → always shown
 * It never redirects (that is the page Metadata) and changes as soon as the store changes
 * (class session-hidden of styles/foundations/sessions.css; the editing tool preview shows it).
 *
 * Rows by type of user: before anything else, any row whose LAST cell is made only of these
 * words keeps only for those types (filterRowsByUserType); any number of columns. In Drive:
 *   login → user (with a session)   guest → guest   logout → nobody (no session, no guest)
 *   combined with commas: login, guest · login, logout · guest, logout · all three = everybody
 *   | Title     | Tus promociones, cliente | login        |
 *   | Benefit 1 | 🚚 | Envío gratis          | guest, login |
 * The type comes from store user.type; when it changes the page reloads once.
 *
 * The rows are optional and can be anywhere in the table (usually right after the
 * block name). They are removed from the block, so the rest of its code never sees them.
 * Styles: declarations separated by ";" (a comma can be part of a CSS value, e.g.
 * rgba(0, 0, 0, .5) or a font list). Bare numbers get "px" (padding-left: 20 → 20px).
 * Classname: names separated by spaces or commas.
 *
 * Separators accepted:
 *   ┌─────────────┬──────────────────────────────────────────────┐
 *   │ Styles      │ ";"   "\n"                                   │
 *   │ Classname   │ espacio   tab   "\n"   ","   ";"             │
 *   └─────────────┴──────────────────────────────────────────────┘
 *   (Styles NO acepta "," porque rompería valores como rgba(0,0,0,.5) o Arial, sans-serif)
 *   (Styles NO acepta espacios ni tabs porque son parte de la sintaxis CSS:
 *    padding: 0 20px, margin: 10px auto, font: italic bold 12px Arial…)
 *   (Classname acepta ";" de forma defensiva: si el autor lo escribe por error, no rompe)
 *
 * Called by: hero-novamovil, card-categories, card-featured, card-promotions, breadcrumb,
 * product-catalog, product-detail, login, block-session-example, account-profile (first line of
 * decorate).
 * New NovaMóvil blocks must do the same.
 *
 * Flow:
 *   applyBlockOptions(block)            default export, one call per block
 *     ├─ page redirecting → the block is emptied, nothing else
 *     │                     (getSessionData().page.isAccessAllowed of session.js)
 *     ├─ rows by type    → filterRowsByUserType(block) (rows of other types are removed;
 *     │                     type from store user.type)
 *     ├─ "Styles" row    → applyAuthorStyles(block, text)  + display:flow-root on the wrapper
 *     ├─ "Classname" row → applyAuthorClasses(block, text)
 *     └─ "Session" row   → showOnlyWhenSession(wrapper, true | false) (store session.isSession)
 *     (the rows are then removed)
 *
 * Guide: documentation/06-styles-classname.md
 */
import { USER_TYPES, getSessionData, isNavigationPending } from './session.js';
import { store } from './store.js';

const STYLE_KEYS = ['styles', 'style'];
const SESSION_KEYS = ['session'];
// "Session" row of a block → shown when store session.isSession is this (a guest is not one)
const BLOCK_SESSION_VALUES = {
  true: true,
  false: false,
};
// class of a block hidden by its Session row (sessions.css; the editing tool preview shows it)
const SESSION_HIDDEN_CLASS = 'session-hidden';
// what authors write in the LAST cell of a row (Drive) → the type of user it is for
const DRIVE_USER_TYPE_WORDS = {
  login: USER_TYPES.USER,
  guest: USER_TYPES.GUEST,
  logout: USER_TYPES.NONE,
};
const DRIVE_WORD_SEPARATOR = /[\s,;]+/;
const CLASS_KEYS = [
  'classname',
  'classnames',
  'class name',
  'class names',
  'class',
];
const PROPERTY = /^-{0,2}[a-z][a-z0-9-]*$/i;
const CLASS_NAME = /^-?[_a-z][_a-z0-9-]*$/i;
// no external resources or script-like values from authored styles
const UNSAFE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|[<>{}]/i;
const BARE_NUMBER = /^-?\d*\.?\d+$/;

// Separadores de authoring
// STYLE_SEPARATOR: ";" y "\n". NO acepta "," (rompería rgba(0,0,0,.5), Arial, sans-serif)
// ni espacios/tabs (son parte de la sintaxis CSS: padding: 0 20px).
const STYLE_SEPARATOR = /[;\n]/;
// CLASS_SEPARATOR: espacio, tab, "\n", "," y ";" (este último defensivo).
const CLASS_SEPARATOR = /[\s,;]+/;

/**
 * Applies "property: value; property: value" to the block; invalid or unsafe
 * declarations are skipped.
 * @param {Element} block
 * @param {string} declarations
 */
export function applyAuthorStyles(block, declarations) {
  String(declarations || '')
    .split(STYLE_SEPARATOR) // VALIDOS: ";"  "\n"
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 1) {
        return;
      }
      const property = declaration.slice(0, separator).trim().toLowerCase();
      let value = declaration.slice(separator + 1).trim();
      if (!PROPERTY.test(property) || !value || UNSAFE_VALUE.test(value)) {
        return;
      }
      const important = /!important$/i.test(value);
      value = value.replace(/\s*!important$/i, '');

      block.style.setProperty(property, value, important ? 'important' : '');
      // unitless numbers are invalid for lengths: retry as px (padding-left: 20 → 20px)
      if (!block.style.getPropertyValue(property) && BARE_NUMBER.test(value)) {
        block.style.setProperty(
          property,
          `${value}px`,
          important ? 'important' : '',
        );
      }
    });
}

/**
 * Adds "name other-name" / "name, other-name" as classes on the block.
 * @param {Element} block
 * @param {string} names
 */
export function applyAuthorClasses(block, names) {
  String(names || '')
    .split(CLASS_SEPARATOR) // VALIDOS: espacio  tab  "\n"  ","  ";"
    .map((name) => name.trim())
    .filter((name) => CLASS_NAME.test(name))
    .forEach((name) => block.classList.add(name));
}

let reloadRegistered = false;

/**
 * The type of whoever is visiting, from store user.type ('' = nobody → USER_TYPES.NONE).
 * @returns {string} One of USER_TYPES
 */
function readStoreUserType() {
  return store.get('user.type') || USER_TYPES.NONE;
}

/**
 * Types of the last cell of a row ('login, guest' → ['user', 'guest']), or null when the cell
 * is empty or has any word that is not login / guest / logout (then it is a normal cell).
 * @param {string} text
 * @returns {string[]|null}
 */
function readDriveUserTypes(text) {
  const words = String(text || '').toLowerCase().split(DRIVE_WORD_SEPARATOR).filter(Boolean);
  if (!words.length || !words.every((word) => word in DRIVE_USER_TYPE_WORDS)) {
    return null;
  }
  return [...new Set(words.map((word) => DRIVE_USER_TYPE_WORDS[word]))];
}

/**
 * Reloads the page once when store user.type changes (pages whose tables have rows by type),
 * unless a navigation already started (goToPage of session.js).
 */
function reloadPageOnUserTypeChange() {
  if (reloadRegistered) {
    return;
  }
  reloadRegistered = true;
  let isFirstCall = true;
  store.subscribe('user.type', () => {
    // subscribe calls once right away: only later changes reload
    if (isFirstCall) {
      isFirstCall = false;
      return;
    }
    setTimeout(() => {
      if (!isNavigationPending()) {
        window.location.reload();
      }
    }, 0);
  });
}

/**
 * Rows by type of user: a row of 2 or more cells whose LAST cell is made only of login / guest /
 * logout stays only for those types (store user.type), whatever the block and its number of
 * columns. That cell is removed from the rows that stay (row.dataset.session keeps the types,
 * e.g. "user guest"), so the block reads its table as always. Rows with an empty last cell, a
 * single cell, or other text in it are not touched (always shown).
 * @param {Element} block
 * @returns {boolean} true when the block had rows by type
 */
function filterRowsByUserType(block) {
  let hasTypeRows = false;
  const userType = readStoreUserType();
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cells = [...row.children];
    const lastCell = cells[cells.length - 1];
    const types = cells.length < 2 ? null : readDriveUserTypes(lastCell.textContent);
    if (!types) {
      return;
    }
    hasTypeRows = true;
    lastCell.remove();
    row.dataset.session = types.join(' ');
    if (!types.includes(userType)) {
      row.remove();
    }
  });
  if (hasTypeRows) {
    reloadPageOnUserTypeChange();
  }
  return hasTypeRows;
}

/**
 * Session row of a block: the block and its wrapper are shown only while store
 * session.isSession is the authored value (true / false), and change at once with it.
 * @param {Element} element The wrapper (or the block)
 * @param {boolean} visibleWhen
 */
function showOnlyWhenSession(element, visibleWhen) {
  store.subscribe('session.isSession', (isSession) => {
    element.classList.toggle(SESSION_HIDDEN_CLASS, isSession !== visibleWhen);
  });
}

/**
 * Applies the rows by type of user, then reads, applies and removes the optional Styles /
 * Classname / Session rows of a block.
 * @param {Element} block A decorated block (div.block)
 */
export default function applyBlockOptions(block) {
  // the page is redirecting (Metadata Session rule, session.js): nothing to show
  if (!getSessionData().page.isAccessAllowed) {
    block.replaceChildren();
    return;
  }
  // first: rows by type of user (| key | value… | login |)
  filterRowsByUserType(block);
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const [keyCell, valueCell, ...extraCells] = row.children;
    // name | value; extra cells are allowed only if empty (tables with 3+ columns)
    if (
      !keyCell
      || !valueCell
      || extraCells.some((cell) => cell.textContent.trim())
    ) {
      return;
    }
    const key = keyCell.textContent.trim().toLowerCase();
    if (STYLE_KEYS.includes(key)) {
      applyAuthorStyles(block, valueCell.textContent);
      // authored margins add to the section spacing instead of collapsing into it
      if (block.getAttribute('style') && block.parentElement) {
        block.parentElement.style.display = 'flow-root';
      }
      row.remove();
    } else if (CLASS_KEYS.includes(key)) {
      applyAuthorClasses(block, valueCell.textContent);
      row.remove();
    } else if (SESSION_KEYS.includes(key)) {
      // true / false; the wrapper too, so a hidden block leaves no empty space
      const visibleWhen = BLOCK_SESSION_VALUES[valueCell.textContent.trim().toLowerCase()];
      if (visibleWhen !== undefined) {
        const wrapper = block.parentElement?.classList.contains(`${block.classList[0]}-wrapper`)
          ? block.parentElement : block;
        showOnlyWhenSession(wrapper, visibleWhen);
      }
      row.remove();
    }
  });
}
