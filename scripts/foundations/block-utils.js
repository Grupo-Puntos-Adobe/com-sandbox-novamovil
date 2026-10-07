/*
 * Helpers shared by the NovaMóvil blocks. Pure DOM/string utilities, no network calls.
 *
 * Exports (name → what it does → who uses it):
 *   readTableCell(block, rowName)
 *     a row exactly as authored → { text, href, found }      card-* (Endpoint, links)
 *   readRowTextOrDefault(block, rowName, defaultText)
 *     missing row → default, present but empty → ''          card-* (Empty List *, …)
 *   getAlertOptions(config)
 *     Alert Duration / Alert Color → showToast options       card-*
 *   getSafeHref(path)
 *     only same-site paths and http(s) URLs, else null       card-* (service links, images)
 *   buildSectionTitle(block, prefix)
 *     Title row → div.{prefix}-header > section title        card-* (any block with a Title)
 *   formatPrice(value, currency)
 *     $19,999 with LOCALE / CURRENCY of messages.js          card-featured (any price)
 *
 * Card columns come from the grid (styles/foundations/grid.css): container > row > col.
 */
import { LOCALE, CURRENCY } from './messages.js';

const DEFAULT_ALERT_SECONDS = 5;
const DEFAULT_ALERT_VARIANT = 'error';

/**
 * Reads a key/value row exactly as authored (readBlockConfig resolves links against
 * the page, but relative API paths must go to the API base URL).
 * @param {Element} block
 * @param {string} rowName Row name, case-insensitive (e.g. 'endpoint')
 * @returns {{text: string, href: string, found: boolean}} found = the row exists
 */
export function readTableCell(block, rowName) {
  const wanted = rowName.toLowerCase();
  const row = [...block.querySelectorAll(':scope > div')].find(
    (candidate) => candidate.children[0]?.textContent.trim().toLowerCase() === wanted,
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
 *   row missing          → defaultText
 *   row present, empty   → '' (the author wants that part empty)
 *   row present, value   → the value
 * @param {Element} block
 * @param {string} rowName Row name, case-insensitive
 * @param {string} defaultText Used only when the row does not exist
 * @returns {string}
 */
export function readRowTextOrDefault(block, rowName, defaultText) {
  const cell = readTableCell(block, rowName);
  return cell.found ? cell.text : defaultText;
}

/**
 * Floating alert options from the optional Alert Duration (seconds) and
 * Alert Color (error | warning | info | success | hex) rows.
 * @param {Object} config readBlockConfig result
 * @returns {{duration: number, variant: string}}
 */
export function getAlertOptions(config) {
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
export function getSafeHref(path) {
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
 * Section title from the block's Title row, inside the block (so Styles / Classname wrap
 * title + content). No default: without text in the Title row there is no title.
 * Markup: div.{prefix}-header > div.{prefix}-heading[role=heading][aria-level=2]
 * (the block CSS sets its size; the font comes from the global [role='heading']).
 * @param {Element} block
 * @param {string} prefix Block class, e.g. 'card-categories'
 * @returns {Element|null} div.{prefix}-header, or null without title
 */
export function buildSectionTitle(block, prefix) {
  const title = readTableCell(block, 'title').text;
  if (!title) return null;

  const heading = document.createElement('div');
  heading.className = `${prefix}-heading`;
  heading.setAttribute('role', 'heading');
  heading.setAttribute('aria-level', '2');
  heading.textContent = title;

  const header = document.createElement('div');
  header.className = `${prefix}-header`;
  header.append(heading);
  return header;
}

/**
 * Formats a price in LOCALE without decimals ($19,999); an unknown currency code falls
 * back to CURRENCY (both from scripts/foundations/messages.js). Any block that shows prices
 * uses it.
 * @param {number} value
 * @param {string} currency ISO 4217 code, e.g. 'MXN'
 * @returns {string}
 */
export function formatPrice(value, currency) {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(value);
  } catch {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency', currency: CURRENCY, maximumFractionDigits: 0,
    }).format(value);
  }
}
