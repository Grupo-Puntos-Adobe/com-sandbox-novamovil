/*
 * Optional authoring rows for the NovaMóvil blocks. Opt-in: a block calls
 * applyBlockOptions(block) as the FIRST line of its decorate(); template blocks (cards,
 * columns, hero…) do not call it and are left untouched.
 * The page Metadata rule (Session / Redirect To) is not here: it runs on every page, with or
 * without blocks, from scripts/foundations/session.js (loaded first by head.html). The session
 * of the blocks is read from the store (store "session", filled by session.js):
 *   isSession  true only with a login        isGuest  true after "Continuar como invitado"
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
 * Session rows: before anything else, any row whose LAST cell is a state keeps only for that
 * state (filterRowsBySessionState); it works with any number of columns. In Drive:
 *   login   with a session       logout   without a session       guest   as a guest
 *   (several separated by commas; signed-in / signed-out are still accepted)
 *   | Title     | Tus promociones, cliente | login        |
 *   | Benefit 1 | 🚚 | Envío gratis          | guest, login |
 * The state comes from store "session"; when it changes the page reloads once.
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
 *     ├─ session rows    → filterRowsBySessionState(block) (rows of other states are removed;
 *     │                     state from store "session")
 *     ├─ "Styles" row    → applyAuthorStyles(block, text)  + display:flow-root on the wrapper
 *     ├─ "Classname" row → applyAuthorClasses(block, text)
 *     └─ "Session" row   → showOnlyWhenSession(wrapper, true | false) (store session.isSession)
 *     (the rows are then removed)
 *
 * Guide: documentation/06-styles-classname.md
 */
import { SESSION_STATES, getSessionData, isNavigationPending } from './session.js';
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
// what authors write in the LAST cell of a row (Drive) → the state of the visitor; the old
// names are still accepted so published pages keep working
const DRIVE_SESSION_WORDS = {
  login: SESSION_STATES.SIGNED_IN,
  logout: SESSION_STATES.SIGNED_OUT,
  guest: SESSION_STATES.GUEST,
  'signed-in': SESSION_STATES.SIGNED_IN,
  'signed-out': SESSION_STATES.SIGNED_OUT,
};
const SESSION_WORD_SEPARATOR = /[\s,;]+/;
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
 * State of the visitor from store "session": 'signed-in' (isSession), 'guest' (isGuest) or
 * 'signed-out'.
 * @returns {string} One of SESSION_STATES
 */
function readStoreSessionState() {
  const { isSession, isGuest } = store.get('session');
  if (isSession) {
    return SESSION_STATES.SIGNED_IN;
  }
  if (isGuest) {
    return SESSION_STATES.GUEST;
  }
  return SESSION_STATES.SIGNED_OUT;
}

/**
 * States of the last cell of a row ('login, guest' → ['signed-in', 'guest']), or null when the
 * cell is empty or has any word that is not a state (then it is a normal cell).
 * @param {string} text
 * @returns {string[]|null}
 */
function readDriveSessionStates(text) {
  const words = String(text || '').toLowerCase().split(SESSION_WORD_SEPARATOR).filter(Boolean);
  if (!words.length || !words.every((word) => word in DRIVE_SESSION_WORDS)) {
    return null;
  }
  return [...new Set(words.map((word) => DRIVE_SESSION_WORDS[word]))];
}

/**
 * Reloads the page once when store "session" changes (pages whose tables have session rows),
 * unless a navigation already started (goToPage of session.js).
 */
function reloadPageOnSessionChange() {
  if (reloadRegistered) {
    return;
  }
  reloadRegistered = true;
  let isFirstCall = true;
  store.subscribe('session', () => {
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
 * Session rows of a block table: a row of 2 or more cells whose LAST cell is made only of
 * states (| … | login |, | … | logout, guest |) stays only for those states, whatever the block
 * and its number of columns. The state comes from store "session". The state cell is removed
 * from the rows that stay (row.dataset.session keeps it, e.g. "signed-in guest"), so the block
 * reads its table as always. Rows with an empty last cell, a single cell, or a last cell that is
 * not only states are not touched (always shown).
 * @param {Element} block
 * @returns {boolean} true when the block had session rows
 */
function filterRowsBySessionState(block) {
  let hasSessionRows = false;
  const state = readStoreSessionState();
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cells = [...row.children];
    const lastCell = cells[cells.length - 1];
    const states = cells.length < 2 ? null : readDriveSessionStates(lastCell.textContent);
    if (!states) {
      return;
    }
    hasSessionRows = true;
    lastCell.remove();
    row.dataset.session = states.join(' ');
    if (!states.includes(state)) {
      row.remove();
    }
  });
  if (hasSessionRows) {
    reloadPageOnSessionChange();
  }
  return hasSessionRows;
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
 * Applies the session rows, then reads, applies and removes the optional Styles / Classname /
 * Session rows of a block.
 * @param {Element} block A decorated block (div.block)
 */
export default function applyBlockOptions(block) {
  // the page is redirecting (Metadata Session rule, session.js): nothing to show
  if (!getSessionData().page.isAccessAllowed) {
    block.replaceChildren();
    return;
  }
  // first: rows that depend on the session (| key | value… | login |)
  filterRowsBySessionState(block);
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
