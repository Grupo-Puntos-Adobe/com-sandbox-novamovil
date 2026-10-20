/*
 * Empty List Message: the "nothing to show" message of the card blocks (empty list or
 * service error). It paints the icon, title and description the caller sends; the floating
 * alert stays in the caller. Only a part that arrives empty (missing, '' or blank) uses its
 * generic value:
 *   - title / description → generic texts of scripts/foundations/messages.js
 *   - icon → EMPTY_LIST_ICON below
 *
 * Called by card-categories, card-featured, card-promotions, product-catalog and product-detail:
 *   import { buildEmptyListMessage } from '../empty-list-message/empty-list-message.js';
 *   block.replaceChildren(header, buildEmptyListMessage({ icon, title, description }));
 *
 * Its styles live next to it (empty-list-message.css) and are requested as soon as a block
 * imports this file, so they are ready before the message is painted.
 *
 * Markup: div.empty-list-message[role=status] > -icon (aria-hidden) + -title + -description;
 * the three parts are always painted (sent text or generic value).
 * Guide: blocks/empty-list-message/README.md
 */
import { loadCSS } from '../../scripts/aem.js';
import MESSAGES from '../../scripts/foundations/messages.js';

loadCSS(`${window.hlx?.codeBasePath || ''}/blocks/empty-list-message/empty-list-message.css`);

// generic icon of the message, used when the caller sends an empty icon
const EMPTY_LIST_ICON = '📭';

/**
 * The text sent by the caller, or the generic one when it is empty (missing, '' or blank).
 * @param {string} [value]
 * @param {string} fallback
 * @returns {string}
 */
function textOrDefault(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

/**
 * createElement shortcut; content is always set as text (never HTML).
 * @param {string} className
 * @param {string} content
 * @returns {Element}
 */
function createMessagePart(className, content) {
  const part = document.createElement('div');
  part.className = className;
  part.textContent = content;
  return part;
}

/**
 * The "nothing to show" message; an empty part uses its generic value.
 * @param {Object} content What to paint, sent by the caller
 * @param {string} [content.icon] Emoji or short text (Empty List Icon); empty → EMPTY_LIST_ICON
 * @param {string} [content.title] Empty List Title; empty → MESSAGES.emptyListTitle
 * @param {string} [content.description] Empty List Description; empty →
 *   MESSAGES.emptyListDescription
 * @returns {Element} div.empty-list-message[role=status]
 */
// eslint-disable-next-line import/prefer-default-export
export function buildEmptyListMessage({ icon, title, description }) {
  const message = document.createElement('div');
  message.className = 'empty-list-message';
  message.setAttribute('role', 'status');
  const iconPart = createMessagePart(
    'empty-list-message-icon',
    textOrDefault(icon, EMPTY_LIST_ICON),
  );
  iconPart.setAttribute('aria-hidden', 'true');
  message.append(
    iconPart,
    createMessagePart('empty-list-message-title', textOrDefault(title, MESSAGES.emptyListTitle)),
    createMessagePart(
      'empty-list-message-description',
      textOrDefault(description, MESSAGES.emptyListDescription),
    ),
  );
  return message;
}
