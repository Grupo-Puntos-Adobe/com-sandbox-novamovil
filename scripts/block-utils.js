// Helpers shared by the NovaMóvil service-fed blocks (card-categories, card-featured).

const DEFAULT_ALERT_SECONDS = 5;
const DEFAULT_ALERT_VARIANT = 'error';

/**
 * Reads a key/value row exactly as authored (readBlockConfig resolves links against
 * the page, but relative API paths must go to the API base URL).
 * @param {Element} block
 * @param {string} key Row name, case-insensitive (e.g. 'endpoint')
 * @returns {{text: string, href: string}}
 */
export function readRawCell(block, key) {
  const row = [...block.querySelectorAll(':scope > div')]
    .find((r) => r.children[0]?.textContent.trim().toLowerCase() === key.toLowerCase());
  const cell = row?.children[1];
  if (!cell) return { text: '', href: '' };
  const link = cell.querySelector('a');
  return {
    text: (link?.textContent || cell.textContent).trim(),
    href: (link?.getAttribute('href') || '').trim(),
  };
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
    duration: (Number.isFinite(seconds) && seconds >= 0 ? seconds : DEFAULT_ALERT_SECONDS) * 1000,
    variant: String(config['alert-color'] || DEFAULT_ALERT_VARIANT).trim().toLowerCase(),
  };
}

/**
 * Only same-site paths and http(s) URLs are accepted as links from service data.
 * @param {string} path
 * @returns {string|null}
 */
export function safeHref(path) {
  if (typeof path !== 'string' || !path.trim()) return null;
  try {
    const url = new URL(path.trim(), window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
  } catch {
    return null;
  }
}

/**
 * Optional section header owned by the block, from its Title (and Link) rows, so the
 * block's main class wraps title + content (Styles/Classname then apply around both).
 * Markup: div.{prefix}-header > h2.{prefix}-heading + a.{prefix}-link
 * @param {Element} block
 * @param {string} prefix Block class, e.g. 'card-featured'
 * @returns {Element|null} the header, or null when there is no title nor link
 */
export function buildBlockHeader(block, prefix) {
  const title = readRawCell(block, 'title').text;
  const link = readRawCell(block, 'link');
  const href = link.text ? safeHref(link.href) : null;
  if (!title && !href) return null;

  const header = document.createElement('div');
  header.className = `${prefix}-header`;
  if (title) {
    const heading = document.createElement('h2');
    heading.className = `${prefix}-heading`;
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
 * Keeps grid rows balanced: when the items do not fit in one row they are spread
 * evenly (6 → 3 + 3, 4 → 2 + 2 instead of 5 + 1 or 3 + 1) through the
 * --balanced-columns custom property and the .is-balanced class.
 * @param {Element} list Grid container
 * @param {Object} options
 * @param {number} options.minWidth Minimum item width in px
 * @param {number} options.gap Column gap in px
 * @param {MediaQueryList} [options.query] Only balance while this query matches
 * @param {boolean} [options.fillSingleRow=false] When everything fits in one row, still
 *   use as many columns as fit (items keep the width of a full row instead of the CSS default)
 * @param {number} [options.maxColumns=Infinity] Never more columns than this per row
 */
export function balanceColumns(list, {
  minWidth, gap, query, fillSingleRow = false, maxColumns: columnLimit = Infinity,
}) {
  const count = list.children.length;
  const fit = Math.floor((list.clientWidth + gap) / (minWidth + gap));
  const maxColumns = Math.max(1, Math.min(fit, columnLimit));
  let columns = null;
  if (!query || query.matches) {
    if (count > maxColumns) columns = Math.ceil(count / Math.ceil(count / maxColumns));
    else if (fillSingleRow) columns = maxColumns;
  }
  list.classList.toggle('is-balanced', columns !== null);
  if (columns) list.style.setProperty('--balanced-columns', columns);
  else list.style.removeProperty('--balanced-columns');
}

/**
 * Balances the grid now and whenever its size changes.
 * @param {Element} list
 * @param {Object} options See balanceColumns
 */
export function observeBalancedColumns(list, options) {
  new ResizeObserver(() => balanceColumns(list, options)).observe(list);
}
