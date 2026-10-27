/*
 * Account Profile block ("Mi cuenta"): the data of the user of the session, a verified badge
 * and a sign out button. The user comes from the STORE (scripts/foundations/store.js), the only
 * place that has it (session.js fills it on every page):
 *
 *   store.subscribe('user', (user) => render(user));   now and every time the user changes
 *     user → { userId, firstName, lastName, fullName, email, phone, verified, sessionId,
 *              isGuest } (empty values without a session; never the token)
 *
 * The block only decides WHICH data to paint and WITH WHICH label: each one has a label row in
 * the table (FIELD_LABEL_ROWS); without its row, or empty in the user, it is not painted.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Account Profile" table (page /cuenta, which only opens with a session).
 *
 * Authored rows (all optional): Styles, Classname, Session, Title, Name Label, Email Label,
 * Phone Label, User Id Label, Verified Text, Sign Out Text, Empty Text.
 * Content rows have no default: without text that part is not painted.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)                Styles / Classname / Session rows
 *     ├─ readAccountSettings(block)              texts and the label of each field
 *     └─ store.subscribe('user', …) → renderAccountProfile(block, settings, user)
 *          ├─ no user → Empty Text
 *          └─ buildAccountHeader() + buildAccountData() + buildSignOutButton()
 *
 * Columns come from the grid (styles/foundations/grid.css):
 *   container-fluid > row > col-24 (title, card)
 *   data: container-fluid > row > col-24 col-md-8 col-lg-6 (label) + col-24 col-md-16 col-lg-18
 * Markup is divs with ARIA roles, except the button. Guide: blocks/account-profile/README.md
 */
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { createElementWithClass, readTableCell } from '../../scripts/foundations/block-utils.js';
import { logoutUser } from '../../scripts/foundations/session.js';
import { store } from '../../scripts/foundations/store.js';

// table row that gives the label of each value of store "user" (painted in this order)
const FIELD_LABEL_ROWS = {
  fullName: 'name label',
  email: 'email label',
  phone: 'phone label',
  userId: 'user id label',
};

/**
 * Everything the block paints, read from the table before it is replaced.
 * @param {Element} block
 * @returns {Object}
 */
function readAccountSettings(block) {
  const readCellText = (rowName) => readTableCell(block, rowName).text;
  const labels = {};
  Object.entries(FIELD_LABEL_ROWS).forEach(([key, rowName]) => {
    labels[key] = readCellText(rowName);
  });
  return {
    title: readCellText('title'),
    verifiedText: readCellText('verified text'),
    signOutText: readCellText('sign out text'),
    emptyText: readCellText('empty text'),
    labels,
  };
}

/**
 * Avatar with the initials, the full name and the verified badge.
 * @param {Object} user store.get('user')
 * @param {Object} settings readAccountSettings() result
 * @returns {Element} div.account-profile-header
 */
function buildAccountHeader(user, settings) {
  const header = createElementWithClass('div', 'account-profile-header');
  const initials = [user.firstName, user.lastName]
    .map((name) => name.charAt(0))
    .join('')
    .toUpperCase();
  const avatar = createElementWithClass('div', 'account-profile-avatar', initials);
  avatar.setAttribute('aria-hidden', 'true');

  const identity = createElementWithClass('div', 'account-profile-identity');
  identity.append(createElementWithClass('div', 'account-profile-name', user.fullName));
  if (user.verified && settings.verifiedText) {
    identity.append(createElementWithClass('div', 'account-profile-badge', settings.verifiedText));
  }
  header.append(avatar, identity);
  return header;
}

/**
 * The data of the user that have a label row (and a value), as a table (label + value).
 * @param {Object} user store.get('user')
 * @param {Object} settings readAccountSettings() result
 * @returns {Element|null} div.account-profile-data[role=table]
 */
function buildAccountData(user, settings) {
  const rows = Object.keys(FIELD_LABEL_ROWS)
    .filter((key) => settings.labels[key] && user[key])
    .map((key) => ({ key, value: user[key] }));
  if (!rows.length) {
    return null;
  }
  const table = createElementWithClass('div', 'account-profile-data container-fluid');
  table.setAttribute('role', 'table');
  table.setAttribute('aria-label', settings.title || settings.labels.fullName);
  rows.forEach(({ key, value }) => {
    const row = createElementWithClass('div', 'account-profile-field row row-gutter-16');
    row.setAttribute('role', 'row');
    const label = createElementWithClass('div', 'account-profile-label col-24 col-md-8 col-lg-6', settings.labels[key]);
    label.setAttribute('role', 'rowheader');
    const cell = createElementWithClass('div', 'account-profile-value col-24 col-md-16 col-lg-18', String(value));
    cell.setAttribute('role', 'cell');
    row.append(label, cell);
    table.append(row);
  });
  return table;
}

/**
 * Sign out: logoutUser() clears the session; /cuenta (Metadata Session true) then goes to its
 * Redirect To by itself.
 * @param {string} text Sign Out Text
 * @returns {Element|null} button.account-profile-sign-out
 */
function buildSignOutButton(text) {
  if (!text) {
    return null;
  }
  const button = createElementWithClass('button', 'account-profile-sign-out', text);
  button.type = 'button';
  button.addEventListener('click', () => logoutUser());
  return button;
}

/**
 * Paints the block with the user of the store.
 * @param {Element} block
 * @param {Object} settings readAccountSettings() result
 * @param {Object} user store.get('user')
 */
function renderAccountProfile(block, settings, user) {
  const row = createElementWithClass('div', 'row row-gutter-16 row-gutter-y-16');
  const fullWidth = (content) => {
    const col = createElementWithClass('div', 'col-24');
    col.append(content);
    return col;
  };

  if (settings.title) {
    const title = createElementWithClass('div', 'account-profile-title', settings.title);
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '2');
    row.append(fullWidth(title));
  }

  if (!user.userId) {
    // no session (e.g. the editing tool preview): only the Empty Text
    if (settings.emptyText) {
      row.append(fullWidth(createElementWithClass('div', 'account-profile-empty', settings.emptyText)));
    }
  } else {
    const card = createElementWithClass('div', 'account-profile-card');
    card.append(buildAccountHeader(user, settings));
    const data = buildAccountData(user, settings);
    if (data) {
      card.append(data);
    }
    const signOut = buildSignOutButton(settings.signOutText);
    if (signOut) {
      card.append(signOut);
    }
    row.append(fullWidth(card));
  }

  const container = createElementWithClass('div', 'container-fluid');
  container.append(row);
  block.replaceChildren(container);
}

/**
 * Account Profile. The block name gives the main .account-profile class that scopes every style.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // Styles / Classname / Session rows and session rows, before reading
  const settings = readAccountSettings(block);
  // painted now and again when the user of the store changes (e.g. after "Cerrar sesión")
  store.subscribe('user', (user) => renderAccountProfile(block, settings, user));
}
