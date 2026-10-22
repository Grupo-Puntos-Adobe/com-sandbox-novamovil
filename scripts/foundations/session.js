/*
 * Session (foundations): who is visiting, which pages they can open and what they can see.
 * Portable: copy it with styles/foundations/sessions.css (and block-utils.js, used for the
 * safe paths). Everything specific to a site comes from Drive (Metadata / Session rows) or
 * from the settings right below. Guide: documentation/08-sesiones.md
 *
 * Three states (the same words the author writes in Drive):
 *   signed-in    there is a session that has not expired
 *   guest        "Continuar como invitado" (no token: only lets the screens through)
 *   signed-out   neither
 *
 * Part 1 · Session data
 *   signIn(data)          stores the session of a 200 login (and leaves guest mode)
 *   continueAsGuest()     guest mode
 *   signOut()             removes session and guest mode
 *   getSession()          { user, accessToken, tokenType, expiresAt, sessionId } or null
 *   isSignedIn()          true while there is a session
 *   getAccessToken()      'Bearer …' for the Authorization header, or ''
 *   getAccessState()      'signed-in' | 'guest' | 'signed-out'
 *   SESSION_CHANGE_EVENT  on document after any change, detail = { state, session }
 *   The state is also a class on <html> (session-state-*), used by sessions.css.
 *
 * Part 2 · Pages and redirects (page Metadata in Drive)
 *   | Session          | required | guest |   who can open the page (no row: everybody)
 *   | Session Redirect | /login           |   where the others go (default /login)
 *   guardPage()               reads both rows; called by scripts.js before painting
 *   requireSession(options)   the same rule for a block that must redirect by itself
 *   getSessionRedirectUrl()   /login?redirect=%2Fcurrent-page
 *   getReturnPath()           the ?redirect= of the URL, only if it is a path of this site
 *
 * Part 3 · Showing things by session (blocks)
 *   setSessionVisibility(element, 'signed-in, guest')   classes of sessions.css
 *   parseSessionStates(text)                            'signed-in, guest' → ['signed-in', 'guest']
 *   renderForSession(target, views)                     paints the view of the current state
 *                                                       and repaints it when it changes
 *   Any block: optional Session row (scripts/foundations/block-options.js).
 *
 * In the editing tool preview (EDITOR_PREVIEW_HOSTS) pages never redirect and sessions.css
 * shows everything, so private pages can be edited.
 * Stored in sessionStorage (removed when the tab is closed). The refresh token is not kept.
 * Never log the session: it carries the access token.
 */
import { getMetadata } from '../aem.js';
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
// values of the page Metadata "Session" row
export const PAGE_ACCESS = { REQUIRED: 'required', GUEST: 'guest' };
// where a page sends who cannot open it, when its Metadata has no "Session Redirect" row
export const DEFAULT_SESSION_REDIRECT = '/login';
// URL parameter with the page to come back to (/login?redirect=/perfil)
export const REDIRECT_PARAM = 'redirect';
// editing tool preview: no redirects, everything visible
const EDITOR_PREVIEW_HOSTS = /^preview-aemcoder\.adobe\.io$/;
// class on <html> for each state (sessions.css); editor = show everything
const STATE_CLASS_PREFIX = 'session-state-';
const EDITOR_STATE_CLASS = `${STATE_CLASS_PREFIX}editor`;
// longest setTimeout delay (about 24 days)
const MAX_TIMER_DELAY = 2147483647;

let expiryTimer;

/**
 * True inside the editing tool preview.
 * @returns {boolean}
 */
export function isEditorPreview() {
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
 * Removes the session and guest mode; tells the page.
 */
export function signOut() {
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
export function getSession() {
  let session = null;
  try {
    session = JSON.parse(useStorage('get', SESSION_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
  if (!session?.accessToken) return null;
  if (session.expiresAt && Date.now() >= session.expiresAt) {
    signOut();
    return null;
  }
  return session;
}

/**
 * True while there is a session that has not expired.
 * @returns {boolean}
 */
export function isSignedIn() {
  return getSession() !== null;
}

/**
 * Who is visiting: 'signed-in', 'guest' or 'signed-out'.
 * @returns {string} One of SESSION_STATES
 */
export function getAccessState() {
  if (isSignedIn()) return SESSION_STATES.SIGNED_IN;
  if (useStorage('get', GUEST_STORAGE_KEY) === 'true') return SESSION_STATES.GUEST;
  return SESSION_STATES.SIGNED_OUT;
}

/**
 * Value for the Authorization header ('Bearer mock-access-token-abc123'), or '' without session.
 * @returns {string}
 */
export function getAccessToken() {
  const session = getSession();
  return session ? `${session.tokenType || 'Bearer'} ${session.accessToken}` : '';
}

/**
 * Puts the state class on <html> (sessions.css) and signs out when the token expires.
 */
function updateSessionState() {
  const root = document.documentElement;
  [...root.classList]
    .filter((name) => name.startsWith(STATE_CLASS_PREFIX))
    .forEach((name) => root.classList.remove(name));
  root.classList.add(isEditorPreview() ? EDITOR_STATE_CLASS : `${STATE_CLASS_PREFIX}${getAccessState()}`);

  clearTimeout(expiryTimer);
  const session = getSession();
  if (session?.expiresAt) {
    // getSession() removes the expired session and tells the page
    expiryTimer = setTimeout(getSession, Math.min(session.expiresAt - Date.now(), MAX_TIMER_DELAY));
  }
}

/**
 * Updates the state class and tells the blocks of the page.
 */
function notifySessionChange() {
  updateSessionState();
  const detail = { state: getAccessState(), session: getSession() };
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
 * @param {Object} data `data` of the login response
 * @param {Object} data.user userId, email, phone, firstName, lastName, verified
 * @param {string} data.accessToken
 * @param {string} [data.tokenType='Bearer']
 * @param {number} [data.expiresIn] Seconds the token lasts
 * @param {string} [data.sessionId]
 * @returns {Object|null} The stored session (null without accessToken)
 */
export function signIn({
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

// the state class is on <html> as soon as any script imports this file
updateSessionState();

// ---------------------------------------------------------------------------------------------
// Part 2 · Pages and redirects
// ---------------------------------------------------------------------------------------------

/**
 * A path of this site (/perfil?x=1), or '' for anything else (other sites, //host, javascript:).
 * @param {string} path
 * @returns {string}
 */
export function toSitePath(path) {
  const href = getSafeHref(path);
  return href && href.startsWith('/') && !href.startsWith('//') ? href : '';
}

/**
 * The page to come back to (?redirect= of the URL), only when it is a path of this site.
 * @returns {string} '' when there is none or it is not valid
 */
export function getReturnPath() {
  return toSitePath(new URLSearchParams(window.location.search).get(REDIRECT_PARAM));
}

/**
 * Where to send who cannot open the current page: redirectTo, else the "Session Redirect"
 * Metadata row, else DEFAULT_SESSION_REDIRECT; with ?redirect= set to the page to come back to.
 * @param {Object} [options]
 * @param {string} [options.redirectTo] Page to go to (a block that redirects by itself)
 * @param {string} [options.returnTo] Page to come back to (default: the current one)
 * @returns {string} e.g. /login?redirect=%2Fperfil
 */
export function getSessionRedirectUrl({ redirectTo, returnTo } = {}) {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const target = new URL(
    toSitePath(redirectTo) || toSitePath(getMetadata('session-redirect'))
      || DEFAULT_SESSION_REDIRECT,
    window.location.origin,
  );
  const back = toSitePath(returnTo ?? current);
  if (back) target.searchParams.set(REDIRECT_PARAM, back);
  return `${target.pathname}${target.search}`;
}

/**
 * True when the visitor can open something that needs a session (or a guest, if allowed).
 * @param {boolean} allowGuest
 * @returns {boolean}
 */
function hasSessionAccess(allowGuest) {
  const state = getAccessState();
  return state === SESSION_STATES.SIGNED_IN || (allowGuest && state === SESSION_STATES.GUEST);
}

/**
 * Lets the visitor stay only with a session (or as a guest when allowGuest); otherwise sends
 * them to getSessionRedirectUrl() with location.replace ("back" does not return here).
 * Never redirects in the editing tool preview.
 * @param {Object} [options]
 * @param {boolean} [options.allowGuest=false]
 * @param {string} [options.redirectTo] Overrides the "Session Redirect" Metadata row
 * @returns {boolean} true = can stay
 */
export function requireSession({ allowGuest = false, redirectTo } = {}) {
  if (isEditorPreview() || hasSessionAccess(allowGuest)) return true;
  window.location.replace(getSessionRedirectUrl({ redirectTo }));
  return false;
}

/**
 * Page rule from the Metadata "Session" row: required (session) or guest (session or guest).
 * Called by scripts.js before the page is painted; if the visitor signs out while on the
 * page, the rule runs again.
 * @returns {boolean} false = the page is being redirected (do not paint it)
 */
export function guardPage() {
  updateSessionState();
  const access = getMetadata('session').trim().toLowerCase();
  if (![PAGE_ACCESS.REQUIRED, PAGE_ACCESS.GUEST].includes(access)) return true;
  const options = { allowGuest: access === PAGE_ACCESS.GUEST };
  if (!requireSession(options)) return false;
  document.addEventListener(SESSION_CHANGE_EVENT, () => requireSession(options));
  return true;
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
export function parseSessionStates(text) {
  const valid = Object.values(SESSION_STATES);
  return [...new Set(String(text || '')
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter((word) => valid.includes(word)))];
}

/**
 * Who can see an element (classes of sessions.css). No states → visible for everybody.
 * @param {Element} element
 * @param {string|string[]} states 'signed-in, guest' or ['signed-in', 'guest']
 * @returns {Element} The same element
 */
export function setSessionVisibility(element, states) {
  const list = Array.isArray(states) ? states : parseSessionStates(states);
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
export function renderForSession(target, views) {
  const render = () => {
    const state = getAccessState();
    const view = views[state]
      || (state === SESSION_STATES.GUEST ? views[SESSION_STATES.SIGNED_OUT] : null);
    const content = view ? view(getSession()) : null;
    target.replaceChildren(...(content === null || content === undefined ? [] : [content]));
  };
  render();
  document.addEventListener(SESSION_CHANGE_EVENT, render);
  return () => document.removeEventListener(SESSION_CHANGE_EVENT, render);
}
