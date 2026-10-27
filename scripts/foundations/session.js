/*
 * Session (foundations): who is visiting, which pages they can open and what they can see.
 * The only session file of the site, independent of the AEM core (it does not import aem.js).
 * Portable: copy it with styles/foundations/sessions.css (and block-utils.js, used for the
 * safe paths) and add one line to head.html, before scripts.js:
 *   <script nonce="aem" src="/scripts/foundations/session.js" type="module"></script>
 * Guide: documentation/08-sesiones.md
 *
 * How a block uses it (everything with one call each):
 *
 *   import { getSessionData, loginUser, logoutUser, continueAsGuest } from '…/session.js';
 *
 *   const { state, isSignedIn, isGuest, user, fields, page, isEditingToolPreview } =
 *     getSessionData();                    everything you can ask about the session, one call
 *     state       'signed-in' | 'guest' | 'signed-out'
 *     isSignedIn  true with a real session (a guest is not one)
 *     isGuest     true after "Continuar como invitado"
 *     user        { userId, firstName, lastName, fullName, email, phone, verified, sessionId }
 *                 of the session or of the guest ('guest', 'Invitado'); null without a session
 *     fields      the user data ready to paint, without empty values ([] without a session):
 *                 [{ key: 'fullName', value: 'Cliente Nova' }, { key: 'email', value: … }, …]
 *                 keys: USER_FIELDS (fullName, email, phone, userId, verified, sessionId); the
 *                 block puts its own label to each key. Never the token.
 *     page        Metadata of this page: { rule: 'true' | 'false' | '', redirectPath (Redirect
 *                 To, or /), isAccessAllowed (false while the page is being redirected) }
 *     isEditingToolPreview   true in the editing tool preview (no redirects, all visible)
 *
 *   await loginUser(endpoint, requestBody)  POST to the login service; with a 200 the session is
 *                                           stored (sessionStorage) and the page is told
 *   await logoutUser()                      logs out (for now only clears the storage)
 *   continueAsGuest()                       guest mode (stores a guest user, no token)
 *   goToPage(path, { replace })             goes to a page (a session reload does not cancel it)
 *
 *   showOnlyForSessionStates(element, 'signed-in, guest')   shown only to those states
 *   SESSION_CHANGE_EVENT                    on document after any change, detail =
 *                                           getSessionData(). To repaint a part:
 *     const paint = ({ state, user, fields }) => { … };
 *     paint(getSessionData());
 *     document.addEventListener(SESSION_CHANGE_EVENT, (event) => paint(event.detail));
 *
 * Pages (Metadata in Drive), checked on every page as soon as head.html loads this file:
 *   | Session     | true  |   only WITH a session: without one → Redirect To
 *   | Session     | false |   only WITHOUT a session (login): with one → Redirect To
 *   | Redirect To | /x    |   where both go; missing or empty → home /
 *   No Session row (or empty): public page, nothing is checked. The guest is not a session.
 *   Read it with getSessionData().page. Safe paths: toSafeSitePath() of block-utils.js.
 *
 * Used by other foundations: filterRowsBySessionState(block) and parseSessionStateList(text)
 * (block-options.js: rows whose LAST cell is a state), getAuthorizationHeader() and
 * clearUserSession() (scripts/api/interceptors.js: private calls).
 *
 * In the editing tool preview (EDITOR_PREVIEW_HOSTS) pages never redirect and sessions.css
 * shows everything, so private pages can be edited.
 * Stored in sessionStorage (removed when the tab is closed). The refresh token is not kept.
 * Never log the session: it carries the access token.
 */
import { toSafeSitePath } from './block-utils.js';

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------
export const SESSION_CHANGE_EVENT = 'session:change';
export const SESSION_STATES = {
  SIGNED_IN: 'signed-in',
  GUEST: 'guest',
  SIGNED_OUT: 'signed-out',
};
// values of the page Metadata "Session" row (empty or no row = public page)
export const PAGE_SESSION_RULES = {
  REQUIRED: 'true', // only with a session
  SIGNED_OUT_ONLY: 'false', // only without a session (login)
};
// keys of getSessionData().fields, in this order
export const USER_FIELDS = ['fullName', 'email', 'phone', 'userId', 'verified', 'sessionId'];
const SESSION_STORAGE_KEY = 'novamovil-session';
const GUEST_STORAGE_KEY = 'novamovil-guest';
// where a page sends the visitor it does not accept, without "Redirect To": the home page
const DEFAULT_REDIRECT_PATH = '/';
// user stored by continueAsGuest(): same fields as the user of a real session
const GUEST_USER = Object.freeze({
  userId: 'guest',
  email: '',
  phone: '',
  firstName: 'Invitado',
  lastName: '',
  verified: false,
});
// editing tool preview: no redirects, everything visible
const EDITOR_PREVIEW_HOSTS = /^preview-aemcoder\.adobe\.io$/;
// class on <html> for each state (sessions.css); editor = show everything
const STATE_CLASS_PREFIX = 'session-state-';
const EDITOR_STATE_CLASS = `${STATE_CLASS_PREFIX}editor`;
// longest setTimeout delay (about 24 days)
const MAX_TIMER_DELAY = 2147483647;
// show / hide classes by session, next to this file wherever the site is served from
const SESSIONS_CSS_URL = new URL('../../styles/foundations/sessions.css', import.meta.url).href;

let expiryTimer;
// false while the page Metadata rule is redirecting (initPageSession)
let pageAccessAllowed = true;
// a navigation started by goToPage(): the session rows reload must not cancel it
let navigationPending = false;
let reloadOnChangeRegistered = false;

// ---------------------------------------------------------------------------------------------
// Storage (internal)
// ---------------------------------------------------------------------------------------------

/**
 * sessionStorage access that never throws (storage blocked by the browser).
 * @param {'get'|'set'|'remove'} action
 * @param {string} key
 * @param {string} [value]
 * @returns {string|null}
 */
function useStorage(action, key, value) {
  try {
    if (action === 'get') {
      return sessionStorage.getItem(key);
    }
    if (action === 'set') {
      sessionStorage.setItem(key, value);
    }
    if (action === 'remove') {
      sessionStorage.removeItem(key);
    }
  } catch {
    // storage blocked: the session cannot be kept after this page
  }
  return null;
}

/**
 * JSON stored under a key, or null (missing or not JSON).
 * @param {string} key
 * @returns {Object|null}
 */
function readStoredJson(key) {
  try {
    return JSON.parse(useStorage('get', key) || 'null');
  } catch {
    return null;
  }
}

/**
 * True inside the editing tool preview (getSessionData().isEditingToolPreview).
 * @returns {boolean}
 */
function isEditingToolPreview() {
  return EDITOR_PREVIEW_HOSTS.test(window.location.hostname);
}

/**
 * Only removes what is stored (session and guest mode) and tells the page. Used by
 * logoutUser(), by an expired session and by the private interceptor on a 401.
 */
export function clearUserSession() {
  useStorage('remove', SESSION_STORAGE_KEY);
  useStorage('remove', GUEST_STORAGE_KEY);
  // eslint-disable-next-line no-use-before-define
  notifySessionChange();
}

/**
 * The stored login session, or null when there is none or it expired (an expired one is
 * removed). Internal: blocks use getSessionData().
 * @returns {{user: Object, accessToken: string, tokenType: string, expiresAt: number,
 *   sessionId: string}|null}
 */
function readLoginSession() {
  const session = readStoredJson(SESSION_STORAGE_KEY);
  if (!session?.accessToken) {
    return null;
  }
  if (session.expiresAt && Date.now() >= session.expiresAt) {
    clearUserSession();
    return null;
  }
  return session;
}

/**
 * The guest session stored by continueAsGuest() ({ user, sessionId }), or null. An older guest
 * flag that is not JSON still counts as a guest.
 * @returns {{user: Object, sessionId: string}|null}
 */
function readGuestSession() {
  if (!useStorage('get', GUEST_STORAGE_KEY)) {
    return null;
  }
  const guest = readStoredJson(GUEST_STORAGE_KEY);
  return guest?.user ? guest : { user: { ...GUEST_USER }, sessionId: '' };
}

/**
 * 'signed-in', 'guest' or 'signed-out'.
 * @returns {string} One of SESSION_STATES
 */
function readSessionState() {
  if (readLoginSession()) {
    return SESSION_STATES.SIGNED_IN;
  }
  if (readGuestSession()) {
    return SESSION_STATES.GUEST;
  }
  return SESSION_STATES.SIGNED_OUT;
}

/**
 * A row of the page Metadata, read from the <meta> tags of the page. aem.page writes
 * <meta name="redirect-to">; some previews keep the authored name (<meta name="Redirect To">):
 * both are accepted.
 * @param {string} name Lower case with hyphens, e.g. 'redirect-to'
 * @returns {string}
 */
function readPageMetadataValue(name) {
  const meta = [...document.head.querySelectorAll('meta[name]')]
    .find((candidate) => candidate.name.trim().toLowerCase().replace(/\s+/g, '-') === name);
  return meta?.content.trim() || '';
}

/**
 * Where to send who cannot stay on the current page: the "Redirect To" Metadata row (a path of
 * this site, as authored: nothing is added to the URL); missing or empty → home.
 * (getSessionData().page.redirectPath)
 * @returns {string} e.g. /login, or /
 */
function getPageRedirectPath() {
  return toSafeSitePath(readPageMetadataValue('redirect-to')) || DEFAULT_REDIRECT_PATH;
}

/**
 * The page Metadata "Session" row in lower case: 'true', 'false' or '' (public).
 * (getSessionData().page.rule)
 * @returns {string}
 */
function readPageSessionRule() {
  return readPageMetadataValue('session').toLowerCase();
}

// ---------------------------------------------------------------------------------------------
// Reading the session: one call
// ---------------------------------------------------------------------------------------------

/**
 * Everything about whoever is visiting, in one call.
 * @returns {{
 *   state: string,
 *   isSignedIn: boolean,
 *   isGuest: boolean,
 *   user: {userId: string, firstName: string, lastName: string, fullName: string,
 *     email: string, phone: string, verified: boolean, sessionId: string}|null,
 *   fields: {key: string, value: (string|boolean)}[],
 *   page: {rule: string, redirectPath: string, isAccessAllowed: boolean},
 *   isEditingToolPreview: boolean,
 * }} user and fields come from the login session or the guest one; null / [] without a
 *   session. fields keeps the USER_FIELDS order and leaves out empty values. page is the
 *   Metadata of the current page: rule 'true' | 'false' | '', redirectPath (Redirect To or /)
 *   and isAccessAllowed (false while the page is being redirected). Never the token.
 */
export function getSessionData() {
  const state = readSessionState();
  const isSignedIn = state === SESSION_STATES.SIGNED_IN;
  const isGuest = state === SESSION_STATES.GUEST;
  const session = (isSignedIn && readLoginSession()) || (isGuest && readGuestSession()) || null;
  const stored = session?.user;
  const user = stored ? {
    userId: stored.userId ?? '',
    firstName: stored.firstName ?? '',
    lastName: stored.lastName ?? '',
    fullName: [stored.firstName, stored.lastName].filter(Boolean).join(' '),
    email: stored.email ?? '',
    phone: stored.phone ?? '',
    verified: stored.verified === true,
    sessionId: session.sessionId ?? '',
  } : null;
  const fields = user
    ? USER_FIELDS
      .map((key) => ({ key, value: user[key] }))
      .filter(({ value }) => value !== '' && value !== null && value !== undefined)
    : [];
  return {
    state,
    isSignedIn,
    isGuest,
    user,
    fields,
    page: {
      rule: readPageSessionRule(),
      redirectPath: getPageRedirectPath(),
      isAccessAllowed: pageAccessAllowed,
    },
    isEditingToolPreview: isEditingToolPreview(),
  };
}

/**
 * Value for the Authorization header ('Bearer mock-access-token-abc123'), or '' without session.
 * For the private interceptor (scripts/api/interceptors.js).
 * @returns {string}
 */
export function getAuthorizationHeader() {
  const session = readLoginSession();
  return session ? `${session.tokenType || 'Bearer'} ${session.accessToken}` : '';
}

/**
 * Puts the state class on <html> (sessions.css) and signs out when the token expires.
 */
function updateSessionStateClass() {
  const root = document.documentElement;
  [...root.classList]
    .filter((name) => name.startsWith(STATE_CLASS_PREFIX))
    .forEach((name) => root.classList.remove(name));
  root.classList.add(isEditingToolPreview() ? EDITOR_STATE_CLASS : `${STATE_CLASS_PREFIX}${readSessionState()}`);

  clearTimeout(expiryTimer);
  const session = readLoginSession();
  if (session?.expiresAt) {
    // readLoginSession() removes the expired session and tells the page
    const delay = Math.min(session.expiresAt - Date.now(), MAX_TIMER_DELAY);
    expiryTimer = setTimeout(readLoginSession, delay);
  }
}

/**
 * Updates the state class and tells the blocks of the page (detail = getSessionData()).
 */
function notifySessionChange() {
  updateSessionStateClass();
  document.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT, { detail: getSessionData() }));
}

// ---------------------------------------------------------------------------------------------
// Actions: log in, log out, guest
// ---------------------------------------------------------------------------------------------

/**
 * Stores the data of a 200 login answer (leaves guest mode) and tells the page.
 * @param {Object} data `data` of the login response: user, accessToken, tokenType, expiresIn,
 *   sessionId
 * @returns {boolean} false without accessToken (nothing is stored)
 */
function storeLoginSession({
  user, accessToken, tokenType, expiresIn, sessionId,
} = {}) {
  if (typeof accessToken !== 'string' || !accessToken) {
    return false;
  }
  const seconds = Number(expiresIn);
  const session = {
    user: {
      userId: user?.userId ?? '',
      email: user?.email ?? '',
      phone: user?.phone != null ? String(user.phone) : '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      verified: user?.verified === true,
    },
    accessToken,
    tokenType: typeof tokenType === 'string' && tokenType ? tokenType : 'Bearer',
    expiresAt: Number.isFinite(seconds) && seconds > 0 ? Date.now() + seconds * 1000 : 0,
    sessionId: sessionId ?? '',
  };
  useStorage('set', SESSION_STORAGE_KEY, JSON.stringify(session));
  useStorage('remove', GUEST_STORAGE_KEY);
  notifySessionChange();
  return true;
}

/**
 * Logs the user in: POSTs requestBody to endpoint (public call) and, with a 200, stores the
 * session in sessionStorage and tells the page. Any block that logs in only sends these two.
 * The HTTP client is loaded on the first call (pages that never log in do not load it).
 * @param {string} endpoint URL of the login service
 * @param {Object} requestBody Body the service expects, e.g.
 *   { meta, security, data: { emailOrPhone, password } }
 * @returns {Promise<Object>} getSessionData() after the login
 * @throws {ApiError} The service answered an error (its JSON body is in error.cause), there
 *   was no answer, or the answer has no accessToken
 */
export async function loginUser(endpoint, requestBody) {
  // loaded on demand: the interceptors import this file, so a static import would be a cycle
  const [{ post, REQUEST_TYPE }, { ApiError }] = await Promise.all([
    // eslint-disable-next-line import/no-cycle
    import('../api/http-client.js'),
    // eslint-disable-next-line import/no-cycle
    import('../api/interceptors.js'),
  ]);
  const response = await post(endpoint, requestBody, { interceptor: REQUEST_TYPE.PUBLIC });
  if (!storeLoginSession(response?.data)) {
    throw new ApiError('Login answer without accessToken', { status: 200, url: endpoint, cause: response });
  }
  return getSessionData();
}

/**
 * Logs the user out. For now it only removes the stored session and guest mode (there is no
 * logout service yet); it is async so it can call one later without changing the callers.
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  clearUserSession();
}

/**
 * Guest mode ("Continuar como invitado"): stores a guest user with the same fields as a real
 * one (GUEST_USER: 'guest', 'Invitado') and its own sessionId, and tells the page. No token.
 */
export function continueAsGuest() {
  const guestSession = {
    user: { ...GUEST_USER },
    sessionId: `guest-${window.crypto?.randomUUID?.() || Date.now()}`,
  };
  useStorage('set', GUEST_STORAGE_KEY, JSON.stringify(guestSession));
  notifySessionChange();
}

// ---------------------------------------------------------------------------------------------
// Pages and redirects (page Metadata)
// ---------------------------------------------------------------------------------------------

/**
 * Goes to a page of the site; a page reload asked by session rows does not cancel it.
 * @param {string} path
 * @param {Object} [options]
 * @param {boolean} [options.replace=false] location.replace ("back" does not return here)
 */
export function goToPage(path, { replace = false } = {}) {
  navigationPending = true;
  if (replace) {
    window.location.replace(path);
  } else {
    window.location.assign(path);
  }
}

/**
 * True when the visitor can stay on a page with this Metadata rule. Always true in the
 * editing tool preview.
 *   true  → only with a session (a guest is not enough)
 *   false → only without a session (a guest can stay)
 *   other → public
 * @param {string} rule readPageSessionRule()
 * @returns {boolean}
 */
function canStayOnPage(rule) {
  if (isEditingToolPreview()) {
    return true;
  }
  const { isSignedIn } = getSessionData();
  if (rule === PAGE_SESSION_RULES.REQUIRED) {
    return isSignedIn;
  }
  if (rule === PAGE_SESSION_RULES.SIGNED_OUT_ONLY) {
    return !isSignedIn;
  }
  return true;
}

/**
 * Page rule from the Metadata "Session" row: a visitor who cannot stay goes to "Redirect To"
 * (location.replace: "back" does not return here). It runs again whenever the session changes
 * on the page (after a login on /login, after a logout on a private page).
 * @returns {boolean} false = the page is being redirected (do not paint it)
 */
function applyPageSessionRule() {
  updateSessionStateClass();
  const rule = readPageSessionRule();
  if (rule !== PAGE_SESSION_RULES.REQUIRED && rule !== PAGE_SESSION_RULES.SIGNED_OUT_ONLY) {
    return true;
  }
  const checkPage = () => {
    if (canStayOnPage(rule)) {
      return true;
    }
    goToPage(getPageRedirectPath(), { replace: true });
    return false;
  };
  if (!checkPage()) {
    return false;
  }
  document.addEventListener(SESSION_CHANGE_EVENT, checkPage);
  return true;
}

/**
 * Adds styles/foundations/sessions.css to the page (once).
 */
function loadSessionStyles() {
  const loaded = [...document.head.querySelectorAll('link[rel="stylesheet"]')]
    .some((link) => link.href === SESSIONS_CSS_URL);
  if (loaded) {
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SESSIONS_CSS_URL;
  document.head.append(link);
}

/**
 * Start of the session on every page (runs once, when this file loads from head.html, before
 * scripts.js): loads sessions.css, puts the state class on <html> and runs the page Metadata
 * rule. A page without a Session row is not touched; a page that redirects is hidden.
 */
function initPageSession() {
  loadSessionStyles();
  pageAccessAllowed = applyPageSessionRule();
  if (!pageAccessAllowed) {
    document.body.style.visibility = 'hidden';
  }
}

// ---------------------------------------------------------------------------------------------
// Showing things by session
// ---------------------------------------------------------------------------------------------

/**
 * Valid states of an authored text: 'Signed-in, guest' → ['signed-in', 'guest'].
 * Unknown words are ignored; empty → [] (everybody).
 * @param {string} text
 * @returns {string[]}
 */
export function parseSessionStateList(text) {
  const valid = Object.values(SESSION_STATES);
  return [...new Set(String(text || '')
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter((word) => valid.includes(word)))];
}

/**
 * True when every word of the text is a state ('signed-in, guest'); false for anything else.
 * @param {string} text
 * @returns {boolean}
 */
function isSessionStateText(text) {
  const words = String(text || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
  const valid = Object.values(SESSION_STATES);
  return words.length > 0 && words.every((word) => valid.includes(word));
}

/**
 * Reloads the page once when the session changes (pages whose tables have session rows),
 * unless a navigation already started (goToPage).
 */
function reloadPageOnSessionChange() {
  if (reloadOnChangeRegistered) {
    return;
  }
  reloadOnChangeRegistered = true;
  document.addEventListener(SESSION_CHANGE_EVENT, () => {
    setTimeout(() => {
      if (!navigationPending) {
        window.location.reload();
      }
    }, 0);
  });
}

/**
 * Session rows of a block table (block-options.js): a row of 2 or more cells whose LAST cell is
 * made only of states (| … | signed-in |, | … | signed-out, guest |) stays only for those
 * states, whatever the block and its number of columns. The state cell is removed from the rows
 * that stay (row.dataset.session keeps it, e.g. "signed-in guest"), so the block reads its
 * table as always. Rows with an empty last cell, a single cell, or a last cell that is not only
 * states are not touched (always shown). The session is read only when the block has such rows.
 * @param {Element} block
 * @returns {boolean} true when the block had session rows
 */
export function filterRowsBySessionState(block) {
  let state = null;
  let hasSessionRows = false;
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cells = [...row.children];
    const lastCell = cells[cells.length - 1];
    if (cells.length < 2 || !isSessionStateText(lastCell.textContent)) {
      return;
    }
    hasSessionRows = true;
    state = state || readSessionState();
    const states = parseSessionStateList(lastCell.textContent);
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
 * Who can see an element (classes of sessions.css). No states → visible for everybody.
 * @param {Element} element
 * @param {string|string[]} states 'signed-in, guest' or ['signed-in', 'guest']
 * @returns {Element} The same element
 */
export function showOnlyForSessionStates(element, states) {
  const list = Array.isArray(states) ? states : parseSessionStateList(states);
  [...element.classList]
    .filter((name) => name === 'session-only' || name.startsWith('session-only-'))
    .forEach((name) => element.classList.remove(name));
  if (list.length) {
    element.classList.add('session-only', ...list.map((state) => `session-only-${state}`));
  }
  return element;
}

// ---------------------------------------------------------------------------------------------
// Start: once per page, as soon as head.html loads this file (before scripts.js and the blocks)
// ---------------------------------------------------------------------------------------------
initPageSession();
