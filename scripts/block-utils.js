/*
 * Helpers shared by the NovaMóvil blocks. Pure DOM/string utilities, no network calls.
 *
 * Exports and who uses them:
 *   readRawCell(block, key)            card-* → Endpoint / Product Link / Promo Link, as authored
 *   readRowText(block, key, fallback)  card-* → Empty List * / Image Error Message rows:
 *                                      missing → default, present but empty → ''
 *   alertOptions(config)               card-* → Alert Duration / Alert Color → showToast options
 *   safeHref(path)                     card-* → validates every link/image URL from service data
 *   buildBlockHeader(block, prefix)    card-* → Title row (+ Link row, card-featured) → header
 *
 * Card columns are pure CSS, written in each block's stylesheet (no JS measuring).
 */

const DEFAULT_ALERT_SECONDS = 5;
const DEFAULT_ALERT_VARIANT = 'error';

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
 * Optional section header owned by the block, from its Title (and Link) rows, so the
 * block's main class wraps title + content (Styles/Classname then apply around both).
 * Markup: div.{prefix}-header > h2.{prefix}-heading + a.{prefix}-link
 * With { asDiv: true } the heading is div.{prefix}-heading[role=heading][aria-level=2]
 * (the block CSS then sets its size; the font comes from the global [role='heading']).
 * @param {Element} block
 * @param {string} prefix Block class, e.g. 'card-featured'
 * @param {Object} [options]
 * Title and Link have no default: a missing or empty row paints nothing.
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
