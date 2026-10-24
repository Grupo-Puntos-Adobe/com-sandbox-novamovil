/*
 * NovaMóvil HTTP interceptors.
 * Every request made through scripts/api/http-client.js runs its interceptor chain:
 *   request(config)            -> may change url, headers, params, body… returns config
 *   response(response, config) -> receives the raw fetch Response, returns the data
 *   error(error, config)       -> may log/transform the error; rethrow to propagate it
 * All three hooks are optional. Add new interceptors here and register them by name.
 *
 * Used by: scripts/api/http-client.js (resolveInterceptors, ApiError).
 * Two kinds of calls, by name (REQUEST_TYPE):
 *   REQUEST_TYPE.PUBLIC  'public-request'   simple calls, no session (default): categories,
 *                                            catalog, detail, login…
 *   REQUEST_TYPE.PRIVATE 'private-request'  calls that need a session: sends the Bearer token
 *                                            (header Authorization + body security.auth.value)
 *   get(url)                                              public
 *   post(url, body, { interceptor: REQUEST_TYPE.PRIVATE }) private
 * Both keep the JSON body of an error answer in ApiError.cause ({ status, errors }), so a
 * block can show the messages of the service. Unknown names fall back to the public chain.
 *
 * Guide: documentation/07-integracion-endpoints.md
 */

// session.js loads the client on demand for loginUser(): not a cycle when the page loads
// eslint-disable-next-line import/no-cycle
import {
  clearUserSession, getAuthorizationHeader, getPageRedirectPath, goToPage, isEditingToolPreview,
} from '../foundations/session.js';

/**
 * Normalised error thrown by the HTTP client, whatever went wrong
 * (network, timeout, HTTP status, invalid JSON).
 */
export class ApiError extends Error {
  /**
   * @param {string} message Human readable reason
   * @param {Object} details
   * @param {number} [details.status] HTTP status (0 for network/timeout errors)
   * @param {string} [details.url] Requested URL
   * @param {*} [details.cause] Original error or response body
   */
  constructor(message, { status = 0, url = '', cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
  }
}

// names of the two request types (the `interceptor` option of http-client.js)
export const REQUEST_TYPE = {
  PUBLIC: 'public-request',
  PRIVATE: 'private-request',
};

/**
 * Simple calls without session: JSON headers, JSON answer. An error answer (400, 401,
 * 500…) is thrown as an ApiError whose `cause` is its parsed JSON body (null when it has none).
 */
export const publicRequestInterceptor = {
  name: REQUEST_TYPE.PUBLIC,
  request(config) {
    return {
      ...config,
      headers: { Accept: 'application/json', ...config.headers },
    };
  },
  async response(response, config) {
    if (!response.ok) {
      let body = null;
      try {
        body = await response.json();
      } catch {
        // no JSON body: the status is enough
      }
      throw new ApiError(`HTTP ${response.status} ${response.statusText}`.trim(), {
        status: response.status,
        url: config.url,
        cause: body,
      });
    }
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch (cause) {
      throw new ApiError('Invalid JSON response', { status: response.status, url: config.url, cause });
    }
  },
};

/**
 * Calls that need a session (goes after publicRequestInterceptor):
 *   - request: Authorization: Bearer … and, when the body has security.auth (the NovaMóvil
 *     request format), the same value there. Without session the service is not called.
 *   - error 401 (no session, expired or rejected token): clearUserSession() and go to the session
 *     redirect page (getPageRedirectPath, never in the editing tool preview).
 */
export const privateRequestInterceptor = {
  name: REQUEST_TYPE.PRIVATE,
  request(config) {
    const token = getAuthorizationHeader();
    if (!token) {
      throw new ApiError('Session required', { status: 401, url: config.url });
    }
    const { body } = config;
    const hasSecurity = body && typeof body === 'object' && body.security?.auth;
    return {
      ...config,
      headers: { ...config.headers, Authorization: token },
      body: hasSecurity
        ? { ...body, security: { ...body.security, auth: { ...body.security.auth, value: token } } }
        : body,
    };
  },
  error(error) {
    if (error.status === 401) {
      clearUserSession();
      if (!isEditingToolPreview()) goToPage(getPageRedirectPath(), { replace: true });
    }
    throw error;
  },
};

const registry = new Map([
  [REQUEST_TYPE.PUBLIC, [publicRequestInterceptor]],
  [REQUEST_TYPE.PRIVATE, [publicRequestInterceptor, privateRequestInterceptor]],
]);

/**
 * Registers (or replaces) a named interceptor chain.
 * @param {string} name Name used as `interceptor` option of the client
 * @param {Object|Object[]} chain One interceptor or an ordered list of interceptors
 */
export function registerInterceptor(name, chain) {
  registry.set(name, [].concat(chain));
}

/**
 * Resolves the `interceptor` option: a registered name, an interceptor object or a list
 * mixing both. Unknown names fall back to the public chain.
 * @param {string|Object|Array} interceptor
 * @returns {Object[]}
 */
export function resolveInterceptors(interceptor = REQUEST_TYPE.PUBLIC) {
  return [].concat(interceptor).flatMap((item) => {
    if (typeof item === 'string') return registry.get(item) || registry.get(REQUEST_TYPE.PUBLIC);
    return item ? [item] : [];
  });
}
