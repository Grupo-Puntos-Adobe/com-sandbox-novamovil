/*
 * Session (foundations): who is visiting, which pages they can open and what they can see.
 * The only session file of the site, independent of the AEM core (it does not import aem.js).
 * Portable: copy it with styles/foundations/sessions.css (and block-utils.js, used for the
 * safe paths) and add one line to head.html, before scripts.js:
 *   <script nonce="aem" src="/scripts/foundations/session.js" type="module"></script>
 * Everything specific to a site comes from Drive (Metadata / Session rows) or from the
 * settings right below. Guide: documentation/08-sesiones.md
 *
 * Start (every page, with or without blocks): head.html loads this file first, and
 * initPageSession() runs once when it loads: sessions.css, the state class on <html> and the
 * page Metadata rule (applyPageSessionRule). A page without a Session row is left as it is.
 * Blocks, block-options.js and the interceptors import this same module afterwards (it never
 * runs twice).
 *   initPageSession()          runs by itself; returns false when the page is being redirected
 *   isPageAccessAllowed()      false while the page is being redirected (do not paint blocks)
 *
 * Three states (the same words the author writes in Drive):
 *   signed-in    there is a session that has not expired
 *   guest        "Continuar como invitado" (no token: only lets the screens through)
 *   signed-out   neither
 *
 * Part 1 · Session data (log in, log out, read it)
 *   loginUser(endpoint, requestBody)  POSTs the login and stores the session of a 200 in
 *                                     sessionStorage; any block that logs in only sends these
 *   logoutUser()                      logs out (for now only clears the storage; async, ready
 *                                     for a logout service)
 *   clearUserSession()                only removes the stored session and guest mode
 *   saveUserSession(loginData)        stores a login answer (used by loginUser)
 *   continueAsGuest()                 guest mode
 *   getUserSession()                  { user, accessToken, tokenType, expiresAt, sessionId }
 *                                     or null
 *   hasActiveSession()                true while there is a session (a guest is not one)
 *   getSessionState()                 'signed-in' | 'guest' | 'signed-out'
 *   getAuthorizationHeader()          'Bearer …' for the Authorization header, or ''
 *   SESSION_CHANGE_EVENT              on document after any change, detail = { state, session }
 *   The state is also a class on <html> (session-state-*), used by sessions.css.
 *
 * Part 2 · Pages and redirects (page Metadata in Drive)
 *   | Session     | true  |   only WITH a session: without one → Redirect To
 *   | Session     | false |   only WITHOUT a session (login): with one → Redirect To
 *   | Redirect To | /x    |   where both go; missing or empty → home /
 *   No Session row (or empty): public page, nothing is checked. The guest is not a session.
 *   applyPageSessionRule()            reads both rows; called once by initPageSession(), before
 *                                     the page is shown
 *   readPageSessionRule()             'true' | 'false' | '' (the Session row of the page)
 *   requireActiveSession(options)     the "true" rule, for a block that must redirect by itself
 *   requireNoActiveSession(options)   the "false" rule
 *   getPageRedirectPath()             the Redirect To path as authored, or / (nothing is added
 *                                     to the URL)
 *   goToPage(path)                    goes to a page (use it after loginUser/continueAsGuest:
 *                                     the page does not reload over the navigation)
 *   toSafeSitePath(path)              only paths of this site, '' for anything else
 *   isEditingToolPreview()            true in the editing tool preview
 *
 * Part 3 · Showing things by session (blocks)
 *   filterRowsBySessionState(block)   rows of ANY block whose LAST cell is a state (signed-in,
 *                                     signed-out, guest, combined with commas), 2+ cells:
 *                                       | Promociones | signed-out |
 *                                       | Title       | Hola, cliente   | signed-in |
 *                                       | Benefit 1   | 🚚 | Envío gratis | guest, signed-in |
 *                                     the rows of other states are removed (and the state cell
 *                                     of the others) before the block reads its table; empty
 *                                     last cell or no state word → always shown. Called by
 *                                     block-options.js (it reads the session only when the
 *                                     block has such rows); when the session changes, a page
 *                                     with such rows reloads.
 *   showOnlyForSessionStates(element, 'signed-in, guest')   classes of sessions.css
 *   parseSessionStateList(text)       'signed-in, guest' → ['signed-in', 'guest']
 *   renderBySessionState(target, views)  paints the view of the current state and repaints it
 *                                        when it changes
 *   Any block: optional Session row (scripts/foundations/block-options.js).
 *
 * In the editing tool preview (EDITOR_PREVIEW_HOSTS) pages never redirect and sessions.css
 * shows everything, so private pages can be edited.
 * Stored in sessionStorage (removed when the tab is closed). The refresh token is not kept.
 * Never log the session: it carries the access token.
 */
import { getSafeHref } from './block-utils.js';

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------
export const SESSION_CHANGE_EVENT = 'session:change';
export const SESSION_STORAGE_KEY = 'novamovil-session';
export const GUEST_STORAGE_KEY = 'novamovil-guest';
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
// where a page sends the visitor it does not accept, when its Metadata has no "Redirect To"
// row (or it is empty): the home page
export const DEFAULT_REDIRECT_PATH = '/';
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

/**
 * True inside the editing tool preview.
 * @returns {boolean}
 */
export function isEditingToolPreview() {
  return EDITOR_PREVIEW_HOSTS.test(window.location.hostname);
}

/**
 * sessionStorage access that never throws (storage blocked by the browser).
 * @param {'get'|'set'|'remove'} action
 * @param {string} key
 * @param {string} [value]
 * @returns {string|null}
 */
function useStorage(action, key, value) {
  try {
    if (action === 'get') return sessionStorage.getItem(key);
    if (action === 'set') sessionStorage.setItem(key, value);
    if (action === 'remove') sessionStorage.removeItem(key);
  } catch {
    // storage blocked: the session cannot be kept after this page
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Part 1 · Session data
// ---------------------------------------------------------------------------------------------

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
 * The stored session, or null when there is none or it expired (an expired one is removed).
 * @returns {{user: Object, accessToken: string, tokenType: string, expiresAt: number,
 *   sessionId: string}|null}
 */
export function getUserSession() {
  let session = null;
  try {
    session = JSON.parse(useStorage('get', SESSION_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
  if (!session?.accessToken) return null;
  if (session.expiresAt && Date.now() >= session.expiresAt) {
    clearUserSession();
    return null;
  }
  return session;
}

/**
 * True while there is a session that has not expired.
 * @returns {boolean}
 */
export function hasActiveSession() {
  return getUserSession() !== null;
}

/**
 * Who is visiting: 'signed-in', 'guest' or 'signed-out'.
 * @returns {string} One of SESSION_STATES
 */
export function getSessionState() {
  if (hasActiveSession()) return SESSION_STATES.SIGNED_IN;
  if (useStorage('get', GUEST_STORAGE_KEY) === 'true') return SESSION_STATES.GUEST;
  return SESSION_STATES.SIGNED_OUT;
}

/**
 * Value for the Authorization header ('Bearer mock-access-token-abc123'), or '' without session.
 * @returns {string}
 */
export function getAuthorizationHeader() {
  const session = getUserSession();
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
  root.classList.add(isEditingToolPreview() ? EDITOR_STATE_CLASS : `${STATE_CLASS_PREFIX}${getSessionState()}`);

  clearTimeout(expiryTimer);
  const session = getUserSession();
  if (session?.expiresAt) {
    // getUserSession() removes the expired session and tells the page
    const delay = Math.min(session.expiresAt - Date.now(), MAX_TIMER_DELAY);
    expiryTimer = setTimeout(getUserSession, delay);
  }
}

/**
 * Updates the state class and tells the blocks of the page.
 */
function notifySessionChange() {
  updateSessionStateClass();
  const detail = { state: getSessionState(), session: getUserSession() };
  document.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT, { detail }));
}

/**
 * Guest mode ("Continuar como invitado"): no token, only lets the guest screens through.
 */
export function continueAsGuest() {
  useStorage('set', GUEST_STORAGE_KEY, 'true');
  notifySessionChange();
}

/**
 * Stores the session of a successful login (leaves guest mode) and tells the page.
 * loginUser() calls it with the answer of the service; call it directly only when the login
 * answer arrives some other way.
 * @param {Object} data `data` of the login response
 * @param {Object} data.user userId, email, phone, firstName, lastName, verified
 * @param {string} data.accessToken
 * @param {string} [data.tokenType='Bearer']
 * @param {number} [data.expiresIn] Seconds the token lasts
 * @param {string} [data.sessionId]
 * @returns {Object|null} The stored session (null without accessToken)
 */
export function saveUserSession({
  user, accessToken, tokenType, expiresIn, sessionId,
} = {}) {
  if (typeof accessToken !== 'string' || !accessToken) return null;
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
  return session;
}

/**
 * Logs the user in: POSTs requestBody to endpoint (public call) and, with a 200, stores the
 * session in sessionStorage and tells the page. Any block that logs in only sends these two.
 * The HTTP client is loaded on the first call (pages that never log in do not load it).
 * @param {string} endpoint URL of the login service
 * @param {Object} requestBody Body the service expects, e.g.
 *   { meta, security, data: { emailOrPhone, password } }
 * @returns {Promise<Object>} The stored session
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
  const session = saveUserSession(response?.data);
  if (!session) {
    throw new ApiError('Login answer without accessToken', { status: 200, url: endpoint, cause: response });
  }
  return session;
}

/**
 * Logs the user out. For now it only removes the stored session and guest mode (there is no
 * logout service yet); it is async so it can call one later without changing the callers.
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  clearUserSession();
}

// ---------------------------------------------------------------------------------------------
// Part 2 · Pages and redirects
// ---------------------------------------------------------------------------------------------

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
 * A path of this site (/perfil?x=1), or '' for anything else (other sites, //host, javascript:).
 * @param {string} path
 * @returns {string}
 */
export function toSafeSitePath(path) {
  const href = getSafeHref(path);
  return href && href.startsWith('/') && !href.startsWith('//') ? href : '';
}

/**
 * Where to send who cannot stay on the current page: redirectTo, else the "Redirect To"
 * Metadata row (a path of this site, as authored: nothing is added to the URL). Missing or
 * empty: DEFAULT_REDIRECT_PATH, the home page.
 * @param {Object} [options]
 * @param {string} [options.redirectTo] Page to go to (a block that redirects by itself)
 * @returns {string} e.g. /login, or /
 */
export function getPageRedirectPath({ redirectTo } = {}) {
  return toSafeSitePath(redirectTo) || toSafeSitePath(readPageMetadataValue('redirect-to'))
    || DEFAULT_REDIRECT_PATH;
}

/**
 * Goes to a page of the site; a page reload asked by session rows does not cancel it.
 * @param {string} path
 * @param {Object} [options]
 * @param {boolean} [options.replace=false] location.replace ("back" does not return here)
 */
export function goToPage(path, { replace = false } = {}) {
  navigationPending = true;
  if (replace) window.location.replace(path);
  else window.location.assign(path);
}

/**
 * True when the visitor can open something that needs a session (or a guest, if allowed).
 * @param {boolean} allowGuest
 * @returns {boolean}
 */
function hasSessionAccess(allowGuest) {
  const state = getSessionState();
  return state === SESSION_STATES.SIGNED_IN || (allowGuest && state === SESSION_STATES.GUEST);
}

/**
 * Lets the visitor stay only with a session (or as a guest when allowGuest); otherwise sends
 * them to getPageRedirectPath() with location.replace ("back" does not return here).
 * Never redirects in the editing tool preview.
 * @param {Object} [options]
 * @param {boolean} [options.allowGuest=false]
 * @param {string} [options.redirectTo] Overrides the "Redirect To" Metadata row
 * @returns {boolean} true = can stay
 */
export function requireActiveSession({ allowGuest = false, redirectTo } = {}) {
  if (isEditingToolPreview() || hasSessionAccess(allowGuest)) return true;
  goToPage(getPageRedirectPath({ redirectTo }), { replace: true });
  return false;
}

/**
 * The opposite: lets the visitor stay only WITHOUT a session (the login page); with one sends
 * them to getPageRedirectPath(). A guest can stay. Never redirects in the editing tool preview.
 * @param {Object} [options]
 * @param {string} [options.redirectTo] Overrides the "Redirect To" Metadata row
 * @returns {boolean} true = can stay
 */
export function requireNoActiveSession({ redirectTo } = {}) {
  if (isEditingToolPreview() || getSessionState() !== SESSION_STATES.SIGNED_IN) return true;
  goToPage(getPageRedirectPath({ redirectTo }), { replace: true });
  return false;
}

/**
 * The page Metadata "Session" row in lower case: 'true', 'false' or '' (public).
 * @returns {string}
 */
export function readPageSessionRule() {
  return readPageMetadataValue('session').toLowerCase();
}

/**
 * Page rule from the Metadata "Session" row (case-insensitive):
 *   true  → only with a session (a guest is not enough); without one → "Redirect To"
 *   false → only without a session; with one → "Redirect To" (after a login on the page too)
 *   empty or no row → public, nothing is checked
 * "Redirect To" missing or empty → home. Called by initPageSession() before the page is
 * shown; the rule runs again whenever the session changes on the page.
 * @returns {boolean} false = the page is being redirected (do not paint it)
 */
export function applyPageSessionRule() {
  updateSessionStateClass();
  const rule = readPageSessionRule();
  const checks = {
    [PAGE_SESSION_RULES.REQUIRED]: requireActiveSession,
    [PAGE_SESSION_RULES.SIGNED_OUT_ONLY]: requireNoActiveSession,
  };
  const check = checks[rule];
  if (!check) return true;
  if (!check()) return false;
  document.addEventListener(SESSION_CHANGE_EVENT, () => check());
  return true;
}

/**
 * False while the page Metadata rule is redirecting: blocks should not paint anything.
 * @returns {boolean}
 */
export function isPageAccessAllowed() {
  return pageAccessAllowed;
}

/**
 * Adds styles/foundations/sessions.css to the page (once).
 */
function loadSessionStyles() {
  const loaded = [...document.head.querySelectorAll('link[rel="stylesheet"]')]
    .some((link) => link.href === SESSIONS_CSS_URL);
  if (loaded) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SESSIONS_CSS_URL;
  document.head.append(link);
}

/**
 * Start of the session on every page (runs once, when this file loads from head.html, before
 * scripts.js): loads sessions.css, puts the state class on <html> and runs the page Metadata
 * rule. A page without a Session row is not touched; a page that redirects is hidden.
 * @returns {boolean} false = the page is being redirected
 */
export function initPageSession() {
  loadSessionStyles();
  pageAccessAllowed = applyPageSessionRule();
  if (!pageAccessAllowed) document.body.style.visibility = 'hidden';
  return pageAccessAllowed;
}

// ---------------------------------------------------------------------------------------------
// Part 3 · Showing things by session
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
  if (reloadOnChangeRegistered) return;
  reloadOnChangeRegistered = true;
  document.addEventListener(SESSION_CHANGE_EVENT, () => {
    setTimeout(() => {
      if (!navigationPending) window.location.reload();
    }, 0);
  });
}

/**
 * Session rows of a block table: a row of 2 or more cells whose LAST cell is made only of states
 * (| … | signed-in |, | … | signed-out, guest |) stays only for those states, whatever the block
 * and its number of columns. The state cell is removed from the rows that stay
 * (row.dataset.session keeps it, e.g. "signed-in guest"), so the block reads its table as
 * always. Rows with an empty last cell, a single cell, or a last cell that is not only states
 * are not touched (always shown). Running it twice changes nothing.
 * @param {Element} block
 * @returns {boolean} true when the block had session rows
 */
export function filterRowsBySessionState(block) {
  // the session is read only when the block has a session row
  let state = null;
  let hasSessionRows = false;
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cells = [...row.children];
    const lastCell = cells[cells.length - 1];
    if (cells.length < 2 || !isSessionStateText(lastCell.textContent)) return;
    hasSessionRows = true;
    state = state || getSessionState();
    const states = parseSessionStateList(lastCell.textContent);
    lastCell.remove();
    row.dataset.session = states.join(' ');
    if (!states.includes(state)) row.remove();
  });
  if (hasSessionRows) reloadPageOnSessionChange();
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

/**
 * Paints in target the view of the current state and repaints it when the session changes.
 * A view is a function (session) → Element | string | null. Missing guest view → the
 * signed-out one; missing view → target stays empty.
 * @param {Element} target
 * @param {{'signed-in'?: Function, guest?: Function, 'signed-out'?: Function}} views
 * @returns {Function} Stops listening to the session
 */
export function renderBySessionState(target, views) {
  const render = () => {
    const state = getSessionState();
    const view = views[state]
      || (state === SESSION_STATES.GUEST ? views[SESSION_STATES.SIGNED_OUT] : null);
    const content = view ? view(getUserSession()) : null;
    target.replaceChildren(...(content === null || content === undefined ? [] : [content]));
  };
  render();
  document.addEventListener(SESSION_CHANGE_EVENT, render);
  return () => document.removeEventListener(SESSION_CHANGE_EVENT, render);
}

// ---------------------------------------------------------------------------------------------
// Start: once per page, as soon as head.html loads this file (before scripts.js and the blocks)
// ---------------------------------------------------------------------------------------------
initPageSession();
