/*
 * NovaMóvil HTTP interceptors.
 * Every request made through scripts/api/http-client.js runs its interceptor chain:
 *   request(config)            -> may change url, headers, params, body… returns config
 *   response(response, config) -> receives the raw fetch Response, returns the data
 *   error(error, config)       -> may log/transform the error; rethrow to propagate it
 * All three hooks are optional. Add new interceptors here and register them by name.
 *
 * Used by: scripts/api/http-client.js (resolveInterceptors, ApiError).
 * Registry: 'public' → [publicInterceptor]; 'public-error-body' → [errorBodyInterceptor,
 * publicInterceptor] (error answers keep their JSON body in ApiError.cause). Blocks pick a
 * chain with get(url, { interceptor: 'name' }); unknown names fall back to 'public'.
 *
 * Guide: documentation/07-integracion-endpoints.md
 */

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

/**
 * Public requests: only the headers a JSON API needs, no credentials or bearer token.
 */
export const publicInterceptor = {
  name: 'public',
  request(config) {
    return {
      ...config,
      headers: { Accept: 'application/json', ...config.headers },
    };
  },
  async response(response, config) {
    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status} ${response.statusText}`.trim(), {
        status: response.status,
        url: config.url,
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
 * Keeps the JSON body of an error answer (400, 401, 500…): services send there what went
 * wrong ({ status: { code, message }, errors: [{ field, message }] }). Goes before
 * publicInterceptor: an ok answer passes through untouched; an error one is thrown as an
 * ApiError whose `cause` is the parsed body (null when it is not JSON).
 */
export const errorBodyInterceptor = {
  name: 'error-body',
  async response(response, config) {
    if (response.ok) return response;
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
  },
};

/*
 * Template for a protected interceptor (not registered). Copy, adapt and register it:
 *
 * import { getAccessToken, signOut } from '../foundations/session.js';
 * export const authInterceptor = {
 *   name: 'auth',
 *   request(config) {
 *     return {
 *       ...config,
 *       headers: { ...config.headers, Authorization: getAccessToken() },
 *     };
 *   },
 *   error(error) {
 *     if (error.status === 401) { // token expired or invalid: sign out and go to /login
 *       signOut();
 *     }
 *     throw error;
 *   },
 * };
 * registerInterceptor('auth', [publicInterceptor, authInterceptor]);
 */

const registry = new Map([
  ['public', [publicInterceptor]],
  // public request whose error answers keep their body (login: field and credential errors)
  ['public-error-body', [errorBodyInterceptor, publicInterceptor]],
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
export function resolveInterceptors(interceptor = 'public') {
  return [].concat(interceptor).flatMap((item) => {
    if (typeof item === 'string') return registry.get(item) || registry.get('public');
    return item ? [item] : [];
  });
}
