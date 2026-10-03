/*
 * Helpers shared by the NovaMóvil blocks, so each block only keeps what is its own
 * (its data, its normalize() and its card). Any new block can use them.
 *
 * Exports, by section:
 *   1. Reading the table
 *      readRawCell(block, key)              a row exactly as authored → { text, href, found }
 *      readRowText(block, key, fallback)    missing row → fallback, present but empty → ''
 *      alertOptions(config)                 Alert Duration / Alert Color → showToast options
 *      readServiceSettings(block, icon)     Endpoint + alert + messages of a service block
 *   2. Service data
 *      safeHref(path)                       only same-site paths and http(s) URLs
 *      safeColor(value)                     only #hex colours
 *      toText(value) / toNumber(value)      trimmed string ('') / number (null)
 *      orderValue(value)                    `order` field → number (no order = last)
 *      activeItems(list)                    array guard + drops `active: false`
 *      uniqueById(items)                    first item of each id
 *      linkFromTemplate(item, template, keys)  item path, or "/productos/{sku}" filled
 *   3. Formats (LOCALE and CURRENCY from scripts/messages.js)
 *      formatNumber(value)                  2,341
 *      formatPrice(value, currency)         $19,999
 *   4. Building the block
 *      el(tag, className, content)          createElement + class + text (never HTML)
 *      buildBlockHeader(block, prefix)      Title row (+ Link row) → div.{prefix}-header
 *      renderSkeleton(block, prefix, header, count)   loading placeholders
 *      renderCards(block, prefix, header, cards, messages)   list or empty message
 *   5. Loading from a service
 *      loadServiceList(endpoint, key, options)  data[key] list; on error alert + []
 *
 * Card columns are pure CSS, written in each block's stylesheet (no JS measuring).
 */
import { readBlockConfig } from './aem.js';
import { get } from './api/http-client.js';
import { showToast } from './toast.js';
import MESSAGES, { LOCALE, CURRENCY } from './messages.js';

const DEFAULT_ALERT_SECONDS = 5;
const DEFAULT_ALERT_VARIANT = 'error';
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
// per block prefix, so heading ids stay card-featured-heading-1, -2…
const headingCounts = new Map();

/* ==========================================================================
   1. Reading the table
   ========================================================================== */

/**
 * Reads a key/value row exactly as authored (readBlockConfig resolves links against
 * the page, but relative API paths must go to the API base URL).
 * @param {Element} block
 * @param {string} key Row name, case-insensitive (e.g. 'endpoint')
 * @returns {{text: string, href: string, found: boolean}} found = the row exists
 */
export function readRawCell(block, key) {
  const row = [...block.querySelectorAll(':scope > div')].find(
    (r) => r.children[0]?.textContent.trim().toLowerCase() === key.toLowerCase(),
  );
  const cell = row?.children[1];
  if (!cell) {
    return { text: '', href: '', found: !!row };
  }
  const link = cell.querySelector('a');
  return {
    text: (link?.textContent || cell.textContent).trim(),
    href: (link?.getAttribute('href') || '').trim(),
    found: true,
  };
}

/**
 * Text of an optional row with three cases:
 *   row missing          → fallback (the default)
 *   row present, empty   → '' (the author wants that part empty)
 *   row present, value   → the value
 * @param {Element} block
 * @param {string} key Row name, case-insensitive
 * @param {string} fallback Default used only when the row does not exist
 * @returns {string}
 */
export function readRowText(block, key, fallback) {
  const cell = readRawCell(block, key);
  return cell.found ? cell.text : fallback;
}

/**
 * Floating alert options from the optional Alert Duration (seconds) and
 * Alert Color (error | warning | info | success | hex) rows.
 * @param {Object} config readBlockConfig result
 * @returns {{duration: number, variant: string}}
 */
export function alertOptions(config) {
  const seconds = Number.parseFloat(config['alert-duration']);
  return {
    duration:
      (Number.isFinite(seconds) && seconds >= 0
        ? seconds
        : DEFAULT_ALERT_SECONDS) * 1000,
    variant: String(config['alert-color'] || DEFAULT_ALERT_VARIANT)
      .trim()
      .toLowerCase(),
  };
}

/**
 * The rows every service block shares, with the defaults of scripts/messages.js:
 *   Endpoint                          as authored (link or text); '' = use the internal JSON
 *   Alert Duration / Alert Color      alertOptions()
 *   Error Response Message            missing or empty → MESSAGES.errorResponseMessage
 *   Empty List Title / Description    missing → MESSAGES; present but empty → ''
 *   Empty List Icon                   missing → the block's icon; present but empty → ''
 * @param {Element} block
 * @param {string} emptyListIcon The block's default icon of the empty message
 * @returns {{endpoint: string, alert: {duration: number, variant: string},
 *   messages: {errorResponseMessage: string, emptyListTitle: string,
 *     emptyListDescription: string, emptyListIcon: string}}}
 */
export function readServiceSettings(block, emptyListIcon) {
  const endpoint = readRawCell(block, 'endpoint');
  return {
    endpoint: endpoint.href || endpoint.text,
    alert: alertOptions(readBlockConfig(block)),
    messages: {
      errorResponseMessage: readRawCell(block, 'error response message').text
        || MESSAGES.errorResponseMessage,
      emptyListTitle: readRowText(block, 'empty list title', MESSAGES.emptyListTitle),
      emptyListDescription: readRowText(
        block,
        'empty list description',
        MESSAGES.emptyListDescription,
      ),
      emptyListIcon: readRowText(block, 'empty list icon', emptyListIcon),
    },
  };
}

/* ==========================================================================
   2. Service data
   ========================================================================== */

/**
 * Only same-site paths and http(s) URLs are accepted as links from service data.
 * @param {string} path
 * @returns {string|null}
 */
export function safeHref(path) {
  if (typeof path !== 'string' || !path.trim()) {
    return null;
  }
  try {
    const url = new URL(path.trim(), window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : url.href;
  } catch {
    return null;
  }
}

/**
 * A colour from service data, only as #rgb or #rrggbb (it ends up in a CSS variable).
 * @param {*} value
 * @returns {string} the colour, or '' when it is not a hex colour
 */
export function safeColor(value) {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : '';
}

/**
 * @param {*} value
 * @returns {string} the trimmed string, or '' when it is not a string
 */
export function toText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {*} value
 * @returns {number|null} the number, or null when it is empty or not numeric
 */
export function toNumber(value) {
  return value === null || value === '' || !Number.isFinite(Number(value))
    ? null : Number(value);
}

/**
 * Value of an `order` field to sort by; items without a valid order go last.
 * @param {*} value
 * @returns {number}
 */
export function orderValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER;
}

/**
 * The list from a service (or an internal JSON) without the `active: false` items.
 * @param {*} list Anything; not an array (null, undefined…) gives []
 * @returns {Object[]}
 */
export function activeItems(list) {
  return (Array.isArray(list) ? list : []).filter((item) => item && item.active !== false);
}

/**
 * Keeps the first item of each `id`.
 * @param {Object[]} items Normalised items with an `id`
 * @returns {Object[]}
 */
export function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * Link of a service item: its own path/url, or the authored template with the item's
 * fields, e.g. "/productos/{sku}" → "/productos/iph-15-128-blk".
 * @param {Object} item Raw item from the service
 * @param {string} template Link row of the block ('' when the table has none)
 * @param {string[]} keys Placeholders allowed in the template, e.g. ['sku', 'id']
 * @returns {string|null} null without path nor template, or when a placeholder stays empty
 */
export function linkFromTemplate(item, template, keys) {
  const own = safeHref(item.path || item.url);
  if (own) return own;
  if (!template) return null;
  const filled = template.replace(
    new RegExp(`\\{(${keys.join('|')})\\}`, 'g'),
    (match, key) => encodeURIComponent(String(item[key] ?? '').toLowerCase()),
  );
  return /\{|\/$/.test(filled) ? null : safeHref(filled);
}

/* ==========================================================================
   3. Formats (LOCALE and CURRENCY live in scripts/messages.js)
   ========================================================================== */

/**
 * @param {number} value
 * @returns {string} the number with LOCALE grouping, e.g. 2,341
 */
export function formatNumber(value) {
  return new Intl.NumberFormat(LOCALE).format(value);
}

/**
 * Price in LOCALE without decimals, e.g. $19,999. An unknown currency code falls back
 * to CURRENCY.
 * @param {number} value
 * @param {string} [currency=CURRENCY] ISO 4217 code, e.g. 'MXN'
 * @returns {string}
 */
export function formatPrice(value, currency = CURRENCY) {
  const options = { style: 'currency', maximumFractionDigits: 0 };
  try {
    return new Intl.NumberFormat(LOCALE, { ...options, currency }).format(value);
  } catch {
    return new Intl.NumberFormat(LOCALE, { ...options, currency: CURRENCY }).format(value);
  }
}

/* ==========================================================================
   4. Building the block
   ========================================================================== */

/**
 * createElement shortcut; content is always set as text (never HTML).
 * @param {string} tag
 * @param {string} className
 * @param {string} [content]
 * @returns {Element}
 */
export function el(tag, className, content) {
  const node = document.createElement(tag);
  node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

/**
 * Optional section header owned by the block, from its Title (and Link) rows, so the
 * block's main class wraps title + content (Styles/Classname then apply around both).
 * Markup: div.{prefix}-header > h2.{prefix}-heading + a.{prefix}-link
 * With { asDiv: true } the heading is div.{prefix}-heading[role=heading][aria-level=2]
 * (the block CSS then sets its size; the font comes from the global [role='heading']).
 * Title and Link have no default: a missing or empty row paints nothing.
 * @param {Element} block
 * @param {string} prefix Block class, e.g. 'card-featured'
 * @param {Object} [options]
 * @param {boolean} [options.asDiv=false] Build the heading as a div instead of an h2
 * @param {boolean} [options.withLink=false] Also read the Link row (a.{prefix}-link)
 * @returns {Element|null} the header, or null when there is no title nor link
 */
export function buildBlockHeader(block, prefix, { asDiv = false, withLink = false } = {}) {
  const title = readRawCell(block, 'title').text;
  const link = withLink ? readRawCell(block, 'link') : { text: '', href: '' };
  const href = link.text ? safeHref(link.href) : null;
  if (!title && !href) {
    return null;
  }

  const header = document.createElement('div');
  header.className = `${prefix}-header`;
  if (title) {
    const heading = document.createElement(asDiv ? 'div' : 'h2');
    heading.className = `${prefix}-heading`;
    if (asDiv) {
      heading.setAttribute('role', 'heading');
      heading.setAttribute('aria-level', '2');
    }
    heading.textContent = title;
    header.append(heading);
  }
  if (href) {
    const cta = document.createElement('a');
    cta.className = `${prefix}-link`;
    cta.href = href;
    cta.textContent = link.text;
    header.append(cta);
  }
  return header;
}

/**
 * Header + grey placeholder cards while the service answers (keeps the layout stable).
 * Markup: div.{prefix}-list[aria-hidden] > div.{prefix}-skeleton × count
 * @param {Element} block
 * @param {string} prefix Block class, e.g. 'card-featured'
 * @param {Element|null} header buildBlockHeader() result
 * @param {number} count How many placeholders
 */
export function renderSkeleton(block, prefix, header, count) {
  const list = el('div', `${prefix}-list`);
  list.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i += 1) list.append(el('div', `${prefix}-skeleton`));
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, list].filter(Boolean));
}

/**
 * "Nothing to show" message (empty list or service error); each part only when it has
 * text, so an authored empty row leaves it out.
 * Markup: div.{prefix}-empty[role=status] > -empty-icon + -empty-title + -empty-text
 * @param {string} prefix
 * @param {{emptyListIcon: string, emptyListTitle: string, emptyListDescription: string}} messages
 * @returns {Element}
 */
function buildEmptyMessage(prefix, messages) {
  const empty = el('div', `${prefix}-empty`);
  empty.setAttribute('role', 'status');
  if (messages.emptyListIcon) {
    const icon = el('div', `${prefix}-empty-icon`, messages.emptyListIcon);
    icon.setAttribute('aria-hidden', 'true');
    empty.append(icon);
  }
  if (messages.emptyListTitle) {
    empty.append(el('div', `${prefix}-empty-title`, messages.emptyListTitle));
  }
  if (messages.emptyListDescription) {
    empty.append(el('div', `${prefix}-empty-text`, messages.emptyListDescription));
  }
  return empty;
}

/**
 * Header + the cards in div.{prefix}-list[role=list], or the empty message when there are
 * no cards. The list is named by the visible title (aria-labelledby → "Categorías, lista").
 * @param {Element} block
 * @param {string} prefix Block class, e.g. 'card-featured'
 * @param {Element|null} header buildBlockHeader() result
 * @param {Element[]} cards Built by the block, one [role=listitem] per item
 * @param {Object} messages readServiceSettings().messages
 */
export function renderCards(block, prefix, header, cards, messages) {
  block.removeAttribute('aria-busy');
  const content = [header].filter(Boolean);
  if (!cards.length) {
    block.replaceChildren(...content, buildEmptyMessage(prefix, messages));
    return;
  }
  const list = el('div', `${prefix}-list`);
  list.setAttribute('role', 'list');
  const heading = header?.querySelector(`.${prefix}-heading`);
  if (heading) {
    const count = (headingCounts.get(prefix) || 0) + 1;
    headingCounts.set(prefix, count);
    heading.id = heading.id || `${prefix}-heading-${count}`;
    list.setAttribute('aria-labelledby', heading.id);
  }
  list.append(...cards);
  block.replaceChildren(...content, list);
}

/* ==========================================================================
   5. Loading from a service
   ========================================================================== */

/**
 * Asks the service for its list (response { data: { [key]: [...] } }). On any error
 * (network, timeout, HTTP status, missing list) it logs it, shows the floating alert
 * and answers [], so the block shows its empty message.
 * @param {string} endpoint Full URL or path relative to API_BASE_URL (Endpoint row)
 * @param {string} key List inside data, e.g. 'products'
 * @param {Object} options
 * @param {string} options.source Block name for the console, e.g. 'card-featured'
 * @param {string} options.errorMessage Text of the alert (Error Response Message)
 * @param {{duration: number, variant: string}} options.alert alertOptions() result
 * @returns {Promise<Object[]>} the raw list, or [] on error
 */
export async function loadServiceList(endpoint, key, { source, errorMessage, alert }) {
  try {
    const response = await get(endpoint);
    const list = response?.data?.[key];
    if (!Array.isArray(list)) {
      throw new Error(`Unexpected response: data.${key} is not a list`);
    }
    return list;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[${source}] Could not load ${key} from`, endpoint, error);
    showToast(errorMessage, alert);
    return [];
  }
}
