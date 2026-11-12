/*
 * Session (foundations): who is visiting, which pages they can open and what they can see.
 * The only session file of the site, independent of the AEM core (it does not import aem.js).
 * Portable: copy it with styles/foundations/sessions.css (and block-utils.js, used for the
 * safe paths) and add one line to head.html, before scripts.js:
 *   <script nonce="aem" src="/scripts/foundations/session.js" type="module"></script>
 * Guide: documentation/08-sesiones.md
 *
 * Two questions, two places of the store (scripts/foundations/store.js), filled ONLY here, on
 * every page start, login, guest, logout and expiry:
 *   Is there a session?        store session.isSession   true ONLY with a login (a guest is not)
 *   What type of user is it?   store user.type           'user' | 'guest' | '' (nobody)
 *   store session.token is the 'Bearer …' of the private calls (never shown, never in "user").
 * Everything else uses the type: USER_TYPES = { USER: 'user', GUEST: 'guest', NONE: 'none' }
 * ('none' is "nobody" in classes and lists; store user.type is '' then, the user is empty).
 *
 * How a block uses it:
 *   import { getSessionData, loginUser, logoutUser, continueAsGuest } from '…/session.js';
 *   const { type, isSignedIn, isGuest, page, isEditingToolPreview } = getSessionData();
 *     type        'user' | 'guest' | 'none'
 *     isSignedIn  true with a login (type 'user')       isGuest  true for type 'guest'
 *     page        Metadata of this page: { rule: 'true' | 'false' | '', redirectPath (Redirect
 *                 To, or /), isAccessAllowed (false while the page is being redirected) }
 *     isEditingToolPreview   true in the editing tool preview (no redirects, all visible)
 *   await loginUser(endpoint, requestBody)  POST to the login service; with a 200 it is stored
 *   await logoutUser()                      logs out (for now only clears the storage)
 *   continueAsGuest()                       guest mode (stores the guest user, no token)
 *   goToPage(path, { replace })             goes to a page (a session reload does not cancel it)
 *   showOnlyForUserTypes(element, [USER_TYPES.USER, USER_TYPES.GUEST])   shown only to them
 *   SESSION_CHANGE_EVENT   on document after any change, detail = getSessionData()
 *
 * Pages (Metadata in Drive), checked on every page as soon as head.html loads this file:
 *   | Session     | true  |   only WITH a session: without one (or a guest) → Redirect To
 *   | Session     | false |   only WITHOUT a session (login): with one → Redirect To
 *   | Redirect To | /x    |   where both go; missing or empty → home /
 *   No Session row (or empty): public page, nothing is checked.
 *
 * Stored in sessionStorage (removed when the tab is closed), in ONE key, novamovil-session:
 *   login  { type: 'user', user, accessToken, tokenType, expiresAt, sessionId }
 *   guest  { type: 'guest', user (GUEST_USER), sessionId }   no token
 * Only type 'user' with a token that did not expire is a session. The refresh token is not
 * kept. Never log the session: it carries the access token.
 * In the editing tool preview (EDITOR_PREVIEW_HOSTS) pages never redirect and sessions.css
 * shows everything, so private pages can be edited.
 */
import { toSafeSitePath } from './block-utils.js';
import { store } from './store.js';

// ---------------------------------------------------------------------------------------------
// 1. Settings
// ---------------------------------------------------------------------------------------------
export const SESSION_CHANGE_EVENT = 'session:change';
// the type of whoever is visiting (getSessionData().type, classes, Drive rows of block-options)
export const USER_TYPES = {
  USER: 'user', // a login with a token
  GUEST: 'guest', // "Continuar como invitado"
  NONE: 'none', // nobody (also an expired session)
};
// values of the page Metadata "Session" row (empty or no row = public page)
export const PAGE_SESSION_RULES = {
  REQUIRED: 'true', // only with a session
  SIGNED_OUT_ONLY: 'false', // only without a session (login)
};
// the ONE sessionStorage key of the session: { type: 'user' | 'guest', user, sessionId, … }
const SESSION_STORAGE_KEY = 'novamovil-session';
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
// class on <html> for each type (sessions.css): session-state-user | -guest | -none | -editor
const TYPE_CLASS_PREFIX = 'session-state-';
const EDITOR_TYPE_CLASS = `${TYPE_CLASS_PREFIX}editor`;
// longest setTimeout delay (about 24 days)
const MAX_TIMER_DELAY = 2147483647;
// show / hide classes by type, next to this file wherever the site is served from
const SESSIONS_CSS_URL = new URL('../../styles/foundations/sessions.css', import.meta.url).href;

let expiryTimer;
// false while the page Metadata rule is redirecting (initPageSession)
let pageAccessAllowed = true;
// a navigation started by goToPage(): the session rows reload must not cancel it
let navigationPending = false;

// ---------------------------------------------------------------------------------------------
// 2. Reading the saved session (the only place that reads sessionStorage)
// ---------------------------------------------------------------------------------------------

/**
 * sessionStorage access that never throws (storage blocked by the browser).
 * @param {'get'|'set'|'remove'} action
 * @param {string} [value]
 * @returns {string|null}
 */
function useStorage(action, value) {
  try {
    if (action === 'get') {
      return sessionStorage.getItem(SESSION_STORAGE_KEY);
    }
    if (action === 'set') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, value);
    }
    if (action === 'remove') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // storage blocked: the session cannot be kept after this page
  }
  return null;
}

/**
 * True when a saved login has an expiry that already passed.
 * @param {Object} saved
 * @returns {boolean}
 */
function isExpired(saved) {
  return Boolean(saved.expiresAt) && Date.now() >= saved.expiresAt;
}

/**
 * The saved session when it is valid: a login (type 'user') with a token that did not expire,
 * or a guest (type 'guest', never with a token). null for anything else.
 * @returns {Object|null}
 */
function readSavedSession() {
  let saved = null;
  try {
    saved = JSON.parse(useStorage('get') || 'null');
  } catch {
    return null;
  }
  if (saved?.type === USER_TYPES.USER) {
    return saved.accessToken && !isExpired(saved) ? saved : null;
  }
  if (saved?.type === USER_TYPES.GUEST) {
    return {
      type: USER_TYPES.GUEST,
      user: saved.user || { ...GUEST_USER },
      sessionId: saved.sessionId ?? '',
    };
  }
  return null;
}

/**
 * The type of whoever is visiting.
 * @returns {string} One of USER_TYPES
 */
function readUserType() {
  return readSavedSession()?.type || USER_TYPES.NONE;
}

// ---------------------------------------------------------------------------------------------
// 3. Page Metadata
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
 * The page Metadata "Session" row in lower case: 'true', 'false' or '' (public).
 * @returns {string}
 */
function readPageSessionRule() {
  return readPageMetadataValue('session').toLowerCase();
}

/**
 * Where to send who cannot stay on the current page: the "Redirect To" Metadata row (a path of
 * this site, as authored); missing or empty → home.
 * @returns {string} e.g. /login, or /
 */
function getPageRedirectPath() {
  return toSafeSitePath(readPageMetadataValue('redirect-to')) || DEFAULT_REDIRECT_PATH;
}

/**
 * True inside the editing tool preview.
 * @returns {boolean}
 */
function isEditingToolPreview() {
  return EDITOR_PREVIEW_HOSTS.test(window.location.hostname);
}

// ---------------------------------------------------------------------------------------------
// 4. Reading the session: one call
// ---------------------------------------------------------------------------------------------

/**
 * Everything about whoever is visiting, in one call. The user data is in the store
 * (store.get('user')), never here; the token neither.
 * @returns {{
 *   type: string,
 *   isSignedIn: boolean,
 *   isGuest: boolean,
 *   page: {rule: string, redirectPath: string, isAccessAllowed: boolean},
 *   isEditingToolPreview: boolean,
 * }}
 */
export function getSessionData() {
  const type = readUserType();
  return {
    type,
    isSignedIn: type === USER_TYPES.USER,
    isGuest: type === USER_TYPES.GUEST,
    page: {
      rule: readPageSessionRule(),
      redirectPath: getPageRedirectPath(),
      isAccessAllowed: pageAccessAllowed,
    },
    isEditingToolPreview: isEditingToolPreview(),
  };
}

// ---------------------------------------------------------------------------------------------
// 5. Telling the page: <html> class, store and expiry, all from the saved session
// ---------------------------------------------------------------------------------------------

/**
 * Puts the type class on <html> (sessions.css); in the editing tool preview, the editor class.
 * @param {string} type One of USER_TYPES
 */
function updateUserTypeClass(type) {
  const root = document.documentElement;
  [...root.classList]
    .filter((name) => name.startsWith(TYPE_CLASS_PREFIX))
    .forEach((name) => root.classList.remove(name));
  root.classList.add(isEditingToolPreview() ? EDITOR_TYPE_CLASS : `${TYPE_CLASS_PREFIX}${type}`);
}

/**
 * Fills the store: "session" (isSession and the token, only with a login) and "user" (of the
 * login or the guest, with its type; emptied without a session). The only place that writes
 * these two slices.
 * @param {Object|null} session readSavedSession()
 */
function syncSessionStore(session) {
  const isUser = session?.type === USER_TYPES.USER;
  store.set('session', {
    isSession: isUser,
    token: isUser ? `${session.tokenType || 'Bearer'} ${session.accessToken}` : '',
  });
  const saved = session?.user;
  if (!saved) {
    store.reset('user');
    return;
  }
  store.set('user', {
    type: session.type,
    userId: saved.userId ?? '',
    firstName: saved.firstName ?? '',
    lastName: saved.lastName ?? '',
    fullName: [saved.firstName, saved.lastName].filter(Boolean).join(' '),
    email: saved.email ?? '',
    phone: saved.phone ?? '',
    verified: saved.verified === true,
    sessionId: session.sessionId ?? '',
  });
}

/**
 * Removes the saved session and tells the page. Used by logoutUser(), by the expiry and by the
 * private interceptor on a 401.
 */
export function clearUserSession() {
  useStorage('remove');
  // eslint-disable-next-line no-use-before-define
  notifySessionChange();
}

/**
 * Signs out when the token of a login expires (longer than a timer allows: it checks again).
 * @param {Object|null} session readSavedSession()
 */
function scheduleSessionExpiry(session) {
  clearTimeout(expiryTimer);
  if (session?.type !== USER_TYPES.USER || !session.expiresAt) {
    return;
  }
  const remaining = session.expiresAt - Date.now();
  expiryTimer = remaining > MAX_TIMER_DELAY
    ? setTimeout(() => scheduleSessionExpiry(readSavedSession()), MAX_TIMER_DELAY)
    : setTimeout(clearUserSession, Math.max(remaining, 0));
}

/**
 * Applies the saved session to the page: <html> class, store and expiry timer.
 */
function applySavedSession() {
  const session = readSavedSession();
  updateUserTypeClass(session?.type || USER_TYPES.NONE);
  syncSessionStore(session);
  scheduleSessionExpiry(session);
}

/**
 * Applies the saved session and tells the blocks of the page (detail = getSessionData()).
 */
function notifySessionChange() {
  applySavedSession();
  document.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT, { detail: getSessionData() }));
}

// ---------------------------------------------------------------------------------------------
// 6. Actions: log in, log out, guest
// ---------------------------------------------------------------------------------------------

/**
 * Saves the data of a 200 login answer as { type: 'user', … } (it replaces a guest) and tells
 * the page.
 * @param {Object} data `data` of the login response: user, accessToken, tokenType, expiresIn,
 *   sessionId
 * @returns {boolean} false without accessToken (nothing is saved)
 */
function saveLoginSession({
  user, accessToken, tokenType, expiresIn, sessionId,
} = {}) {
  if (typeof accessToken !== 'string' || !accessToken) {
    return false;
  }
  const seconds = Number(expiresIn);
  useStorage('set', JSON.stringify({
    type: USER_TYPES.USER,
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
  }));
  notifySessionChange();
  return true;
}

/**
 * Logs the user in: POSTs requestBody to endpoint (public call) and, with a 200, saves the
 * session and tells the page. The HTTP client is loaded on the first call.
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
  if (!saveLoginSession(response?.data)) {
    throw new ApiError('Login answer without accessToken', { status: 200, url: endpoint, cause: response });
  }
  return getSessionData();
}

/**
 * Logs the user out. For now it only removes the saved session (there is no logout service
 * yet); it is async so it can call one later without changing the callers.
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  clearUserSession();
}

/**
 * Guest mode ("Continuar como invitado"): saves { type: 'guest', user: GUEST_USER, sessionId }
 * and tells the page. No token.
 */
export function continueAsGuest() {
  useStorage('set', JSON.stringify({
    type: USER_TYPES.GUEST,
    user: { ...GUEST_USER },
    sessionId: `guest-${window.crypto?.randomUUID?.() || Date.now()}`,
  }));
  notifySessionChange();
}

// ---------------------------------------------------------------------------------------------
// 7. Navigation and the page Metadata rule
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
 * True while goToPage() is leaving the page: a reload asked by the session rows of a block
 * (block-options.js) must not cancel that navigation.
 * @returns {boolean}
 */
export function isNavigationPending() {
  return navigationPending;
}

/**
 * True when the visitor can stay on a page with this Metadata rule (always in the editing
 * tool preview): true → only with a session (a guest is not one); false → only without one.
 * @param {string} rule readPageSessionRule()
 * @returns {boolean}
 */
function canStayOnPage(rule) {
  if (isEditingToolPreview()) {
    return true;
  }
  const isSession = readUserType() === USER_TYPES.USER;
  if (rule === PAGE_SESSION_RULES.REQUIRED) {
    return isSession;
  }
  if (rule === PAGE_SESSION_RULES.SIGNED_OUT_ONLY) {
    return !isSession;
  }
  return true;
}

/**
 * Page rule from the Metadata "Session" row: a visitor who cannot stay goes to "Redirect To"
 * (location.replace). It runs again whenever the session changes on the page.
 * @returns {boolean} false = the page is being redirected (do not paint it)
 */
function applyPageSessionRule() {
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

// ---------------------------------------------------------------------------------------------
// 8. Showing things by type
// ---------------------------------------------------------------------------------------------

/**
 * Who can see an element (classes of sessions.css: session-only + session-only-<type>).
 * No types → visible for everybody.
 * @param {Element} element
 * @param {string[]} types e.g. [USER_TYPES.USER, USER_TYPES.GUEST]
 * @returns {Element} The same element
 */
export function showOnlyForUserTypes(element, types) {
  [...element.classList]
    .filter((name) => name === 'session-only' || name.startsWith('session-only-'))
    .forEach((name) => element.classList.remove(name));
  if (types.length) {
    element.classList.add('session-only', ...types.map((type) => `session-only-${type}`));
  }
  return element;
}

// ---------------------------------------------------------------------------------------------
// 9. Start: once per page, as soon as head.html loads this file (before scripts.js and the blocks)
// ---------------------------------------------------------------------------------------------

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
 * Start of the session on every page: loads sessions.css, removes an expired login, applies
 * the saved session (class, store, expiry; the store starts empty on every page) and runs the
 * page Metadata rule. A page that redirects is hidden.
 */
function initPageSession() {
  loadSessionStyles();
  if (!readSavedSession()) {
    // an expired login (or anything that is not a session) is not kept
    useStorage('remove');
  }
  applySavedSession();
  pageAccessAllowed = applyPageSessionRule();
  if (!pageAccessAllowed) {
    document.body.style.visibility = 'hidden';
  }
}

initPageSession();
