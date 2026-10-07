/*
 * Empty List Message: the "nothing to show" message of the card blocks (empty list or
 * service error). It only paints what the caller sends; the floating alert and the
 * defaults (texts of scripts/foundations/messages.js, the icon of each block) stay in the caller.
 *
 * Called by card-categories, card-featured and card-promotions:
 *   import { buildEmptyListMessage } from '../empty-list-message/empty-list-message.js';
 *   block.replaceChildren(header, buildEmptyListMessage({ icon, title, description }));
 *
 * Its styles live next to it (empty-list-message.css) and are requested as soon as a block
 * imports this file, so they are ready before the message is painted.
 *
 * Markup: div.empty-list-message[role=status] > -icon (aria-hidden) + -title + -description;
 * each part only when it has text (an authored empty row in Drive leaves it out).
 * Guide: blocks/empty-list-message/README.md
 */
import { loadCSS } from '../../scripts/aem.js';

loadCSS(`${window.hlx?.codeBasePath || ''}/blocks/empty-list-message/empty-list-message.css`);

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
 * The "nothing to show" message.
 * @param {Object} content What to paint, sent by the caller
 * @param {string} [content.icon] Emoji or short text (Empty List Icon)
 * @param {string} [content.title] Empty List Title
 * @param {string} [content.description] Empty List Description
 * @returns {Element} div.empty-list-message[role=status]
 */
// eslint-disable-next-line import/prefer-default-export
export function buildEmptyListMessage({ icon, title, description }) {
  const message = document.createElement('div');
  message.className = 'empty-list-message';
  message.setAttribute('role', 'status');
  if (icon) {
    const iconPart = createMessagePart('empty-list-message-icon', icon);
    iconPart.setAttribute('aria-hidden', 'true');
    message.append(iconPart);
  }
  if (title) message.append(createMessagePart('empty-list-message-title', title));
  if (description) message.append(createMessagePart('empty-list-message-description', description));
  return message;
}
