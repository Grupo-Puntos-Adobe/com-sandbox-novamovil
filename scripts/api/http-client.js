/*
 * NovaMóvil HTTP client: the only place that calls fetch().
 * Components call get()/post()/request(); interceptors (scripts/api/interceptors.js)
 * decide headers, auth and how responses and errors are handled.
 *
 * Called by: loadCategoriesFromService(), loadProductsFromService() and
 * loadPromotionsFromService() of the card-* blocks (get(endpoint)), and product-catalog
 * (get(Filters Endpoint) + post(Search Endpoint, body, { signal })). No library: native
 * fetch + AbortSignal.
 *
 * Flow:
 *   get(url) / post(url, body) → request(url, options)
 *     ├─ resolveInterceptors(interceptor)   interceptors.js ('public' by default)
 *     ├─ interceptor.request(config)        each one, in order
 *     ├─ buildUrl(url, params)              relative path → API_BASE_URL
 *     ├─ fetch(…) with AbortSignal.timeout  network/timeout error → ApiError
 *     ├─ interceptor.response(response)     'public' → checks status, returns JSON
 *     └─ on any error: interceptor.error(e) may recover; otherwise the ApiError is thrown
 *
 * Guide: documentation/02-integracion-endpoints.md
 */
import { ApiError, resolveInterceptors } from './interceptors.js';

// used when a component passes a relative path ("/api/v1/...") instead of a full URL
export const API_BASE_URL = 'https://cca7ebd1-f76f-47d0-a949-b4b8618f05e5.mock.pstmn.io';
export const DEFAULT_TIMEOUT = 8000;

/**
 * Builds the absolute URL, resolving relative paths against API_BASE_URL and
 * appending query params.
 * @param {string} url
 * @param {Object} [params]
 * @returns {string}
 */
function buildUrl(url, params) {
  const absolute = new URL(url, /^https?:\/\//i.test(url) ? undefined : API_BASE_URL);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) absolute.searchParams.set(key, value);
  });
  return absolute.toString();
}

/**
 * Performs a request through the interceptor chain.
 * @param {string} url Full URL or path relative to API_BASE_URL
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {Object} [options.headers]
 * @param {*} [options.body] Objects are sent as JSON
 * @param {Object} [options.params] Query string parameters
 * @param {number} [options.timeout=DEFAULT_TIMEOUT] Milliseconds before aborting
 * @param {string|Object|Array} [options.interceptor='public'] Registered name, object or list
 * @param {AbortSignal} [options.signal] Extra signal to cancel the request
 * @returns {Promise<*>} Whatever the response interceptors return (JSON by default)
 */
export async function request(url, options = {}) {
  const {
    interceptor = 'public', timeout = DEFAULT_TIMEOUT, params, signal, ...init
  } = options;
  const chain = resolveInterceptors(interceptor);

  let config = {
    method: 'GET', headers: {}, ...init, url, params,
  };
  try {
    config = await chain.reduce(
      async (prev, item) => (item.request ? item.request(await prev) : prev),
      Promise.resolve(config),
    );

    const {
      url: finalUrl, params: finalParams, body, ...fetchInit
    } = config;
    const isJsonBody = body && typeof body === 'object' && !(body instanceof FormData)
      && !(body instanceof Blob) && !(body instanceof URLSearchParams);
    if (isJsonBody) fetchInit.headers = { 'Content-Type': 'application/json', ...fetchInit.headers };

    // AbortSignal.any is newer (Safari 17.4, Firefox 124): without it only the timeout applies
    const timeoutSignal = AbortSignal.timeout(timeout);
    const combinedSignal = signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([timeoutSignal, signal])
      : timeoutSignal;
    let response;
    try {
      response = await fetch(buildUrl(finalUrl, finalParams), {
        ...fetchInit,
        body: isJsonBody ? JSON.stringify(body) : body,
        signal: combinedSignal,
      });
    } catch (cause) {
      const message = cause.name === 'TimeoutError' ? `Timeout after ${timeout}ms` : 'Network error';
      throw new ApiError(message, { url: finalUrl, cause });
    }

    // response hooks run in order; the first that returns something other than the
    // Response (e.g. parsed JSON) passes its result to the next one
    return await chain.reduce(
      async (prev, item) => (item.response ? item.response(await prev, config) : prev),
      Promise.resolve(response),
    );
  } catch (error) {
    const apiError = error instanceof ApiError
      ? error
      : new ApiError(error.message, { url: config.url, cause: error });
    // error hooks may recover (return a value) or rethrow
    return chain.reduce(
      (prev, item) => (item.error ? prev.catch((e) => item.error(e, config)) : prev),
      Promise.reject(apiError),
    );
  }
}

/** GET shortcut. */
export const get = (url, options = {}) => request(url, { ...options, method: 'GET' });

/** POST shortcut (objects are sent as JSON). */
export const post = (url, body, options = {}) => request(url, { ...options, method: 'POST', body });
