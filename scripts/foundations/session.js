/*
 * Session: who is signed in, shared by every block of the site.
 *
 * Saved by the login block when the login service answers 200; read by any block that needs
 * the user or the token (the 'auth' interceptor of scripts/api/interceptors.js, the header…).
 *   signIn({ user, accessToken, tokenType, expiresIn, sessionId })   stores it, fires the event
 *   getSession()        the stored session, or null (none, or expired)
 *   isSignedIn()        true while there is a session that has not expired
 *   getAccessToken()    'Bearer …' value for the Authorization header, or ''
 *   signOut()           removes it, fires the event
 *   SESSION_CHANGE_EVENT   on document, detail = { session } (null after signOut)
 *
 * Stored in sessionStorage (removed when the tab is closed) under SESSION_STORAGE_KEY. The
 * refresh token is not kept: there is no refresh service yet. When the service sets an
 * HttpOnly cookie (production), only the user data stays here.
 * Never log the session: it carries the access token.
 */

export const SESSION_CHANGE_EVENT = 'session:change';
export const SESSION_STORAGE_KEY = 'novamovil-session';

/**
 * Tells the blocks of the page that the session changed.
 * @param {Object|null} session
 */
function notifySessionChange(session) {
  document.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT, { detail: { session } }));
}

/**
 * Removes the session and tells the blocks of the page.
 */
export function signOut() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // storage blocked by the browser: nothing to remove
  }
  notifySessionChange(null);
}

/**
 * The stored session, or null when there is none or it expired (an expired one is removed).
 * @returns {{user: Object, accessToken: string, tokenType: string, expiresAt: number,
 *   sessionId: string}|null}
 */
export function getSession() {
  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) || 'null');
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
 * Value for the Authorization header ('Bearer mock-access-token-abc123'), or '' without session.
 * @returns {string}
 */
export function getAccessToken() {
  const session = getSession();
  return session ? `${session.tokenType || 'Bearer'} ${session.accessToken}` : '';
}

/**
 * Stores the session of a successful login and tells the blocks of the page.
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
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage blocked by the browser: the session cannot be kept after this page
  }
  notifySessionChange(session);
  return session;
}
