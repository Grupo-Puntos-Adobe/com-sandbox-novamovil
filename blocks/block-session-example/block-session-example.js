/*
 * Block Session Example: everything that can be built with sessions, in one block. It is an
 * example to copy from (no real page uses it); the rest of the site stays public.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Block Session Example" table (page /ejemplo-sesion).
 *
 * What it shows (scripts/foundations/session.js + styles/foundations/sessions.css):
 *   1. Whole block by session: the optional Session row (block-options.js) → the block is only
 *      shown to signed-in / guest / signed-out visitors. It never redirects.
 *   2. Status panel: renderBySessionState() paints the badge and the text of the current state
 *      ("Hola, {name}…" with the user of the session) and repaints them when it changes.
 *   3. Items by session, the generic way of ANY block: "Item | text | signed-in" (the state in
 *      the LAST cell). filterRowsBySessionState() (block-options.js) removes the rows of other
 *      states
 *      before this block reads its table, and the page reloads when the session changes.
 *   4. Actions: Iniciar sesión (link to the login, as authored), Continuar como
 *      invitado (continueAsGuest) and Cerrar sesión (logoutUser), each one only for its state.
 *   5. Private call: with Private Endpoint and a session, post(…, REQUEST_TYPE.PRIVATE) sends
 *      the Bearer token and shows the answer of the service.
 *   6. User data (User Title row): the user of the session, signed in or guest
 *      (renderBySessionState passes getCurrentSession(); a guest has GUEST_USER). Hidden
 *      without a session; the token is never painted.
 *
 * Authored rows (all optional): Styles, Classname, Session, Title, Status Title,
 * Signed In Text ({name} = first name), Guest Text, Signed Out Text, Item (text, any number),
 * Login Link (link), Guest Button Text, Sign Out Text, User Title, Private Title,
 * Private Endpoint.
 * Content rows have no default: without text that part is not painted. Any row can end with a
 * state cell (signed-in | guest | signed-out, combined with commas); without it, everybody.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)          Styles / Classname / Session rows
 *     ├─ readExampleSettings(block)        texts, items, links, endpoint
 *     └─ renderSessionExample()
 *          ├─ buildExampleStatus()         renderBySessionState: badge + text, actions by session
 *          ├─ buildExampleUser()           renderBySessionState: user data (signed in / guest)
 *          ├─ buildExampleItem() × N       the Item rows left for the current state
 *          └─ buildExamplePrivate()        renderBySessionState: private call when signed in
 *
 * No resolution logic here: block-session-example.css decides each resolution. Columns come
 * from the grid (styles/foundations/grid.css):
 *   container-fluid > row row-gutter-16 row-gutter-y-16 > col-24 (title, status, user, private)
 *                                                       + col-24 col-md-12 col-lg-8 (items)
 *   user data: container-fluid > row > col-10 col-md-6 col-lg-4 (label) + col-14 col-md-18
 *   col-lg-20 (value)
 * Markup is divs with ARIA roles, except the links (<a>) and the buttons (<button>).
 * Guide: blocks/block-session-example/README.md
 */
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { readPrivateEndpoint, readTableCell } from '../../scripts/foundations/block-utils.js';
import MESSAGES from '../../scripts/foundations/messages.js';
import {
  SESSION_STATES, continueAsGuest, parseSessionStateList, renderBySessionState,
  logoutUser, showOnlyForSessionStates, toSafeSitePath,
} from '../../scripts/foundations/session.js';
import { post, REQUEST_TYPE } from '../../scripts/api/http-client.js';

// texts of the example itself (not authored): the name of each state
const LABELS = {
  states: {
    [SESSION_STATES.SIGNED_IN]: 'Con sesión',
    [SESSION_STATES.GUEST]: 'Invitado',
    [SESSION_STATES.SIGNED_OUT]: 'Sin sesión',
  },
  everybody: 'Todos',
  audience: 'Lo ve:',
  // user data card (the values come from the session)
  user: {
    table: 'Datos del usuario',
    type: 'Tipo',
    name: 'Nombre',
    email: 'Correo',
    phone: 'Teléfono',
    userId: 'ID de usuario',
    verified: 'Verificado',
    sessionId: 'ID de sesión',
    yes: 'Sí',
    no: 'No',
  },
};
// fixed parts of the example private request (a real service sets its own)
const PRIVATE_REQUEST_META = {
  requestId: 'REQ-SESSION-EXAMPLE-001',
  channel: 'WEB',
  platform: 'DESKTOP',
};
const ITEM_ROW = 'item';

/**
 * createElement shortcut; content is always set as text (never HTML).
 * @param {string} tag
 * @param {string} className
 * @param {string} [content]
 * @returns {Element}
 */
function createElementWithClass(tag, className, content) {
  const node = document.createElement(tag);
  node.className = className;
  if (content !== undefined) {
    node.textContent = content;
  }
  return node;
}

/**
 * "Item" rows left for the current state (filterRowsBySessionState already removed the others), in
 * authored order; states = who sees it (row.dataset.session, empty = everybody).
 * @param {Element} block
 * @returns {{states: string[], text: string}[]}
 */
function readItemRows(block) {
  return [...block.querySelectorAll(':scope > div')]
    .filter((row) => row.children[0]?.textContent.trim().toLowerCase() === ITEM_ROW)
    .map((row) => ({
      states: parseSessionStateList(row.dataset.session),
      text: (row.children[1]?.textContent || '').trim(),
    }))
    .filter((item) => item.text);
}

/**
 * Everything the block paints, read from the table before it is replaced.
 * @param {Element} block
 * @returns {Object}
 */
function readExampleSettings(block) {
  const readCellText = (key) => readTableCell(block, key).text;
  const loginCell = readTableCell(block, 'login link');
  return {
    texts: {
      title: readCellText('title'),
      statusTitle: readCellText('status title'),
      [SESSION_STATES.SIGNED_IN]: readCellText('signed in text'),
      [SESSION_STATES.GUEST]: readCellText('guest text'),
      [SESSION_STATES.SIGNED_OUT]: readCellText('signed out text'),
      guestButton: readCellText('guest button text'),
      signOut: readCellText('sign out text'),
      userTitle: readCellText('user title'),
      privateTitle: readCellText('private title'),
    },
    login: { text: loginCell.text, href: toSafeSitePath(loginCell.href || loginCell.text) },
    items: readItemRows(block),
    // Private Endpoint row → REQUEST_TYPE.PRIVATE (Endpoint rows of other blocks are public)
    privateEndpoint: readPrivateEndpoint(block),
  };
}

/**
 * Badge with the name of a state (its colour comes from the CSS modifier).
 * @param {string} state One of SESSION_STATES
 * @returns {Element}
 */
function buildStateBadge(state) {
  return createElementWithClass(
    'div',
    `block-session-example-badge block-session-example-badge-${state}`,
    LABELS.states[state],
  );
}

/**
 * Text of a state; {name} is the first name (or the email) of the session user.
 * @param {string} text Authored text
 * @param {Object|null} session
 * @returns {Element|null}
 */
function buildStateText(text, session) {
  if (!text) {
    return null;
  }
  const name = session?.user?.firstName || session?.user?.email || '';
  return createElementWithClass('div', 'block-session-example-status-text', text.replace('{name}', name).trim());
}

/**
 * Login link, guest button and sign out button; each one only for its state (sessions.css).
 * @param {Object} settings readExampleSettings() result
 * @returns {Element|null} div.block-session-example-actions
 */
function buildExampleActions(settings) {
  const { texts, login } = settings;
  const actions = createElementWithClass('div', 'block-session-example-actions');

  if (login.text && login.href) {
    const link = createElementWithClass('a', 'block-session-example-button block-session-example-button-primary', login.text);
    link.href = login.href;
    actions.append(showOnlyForSessionStates(link, [SESSION_STATES.SIGNED_OUT]));
  }
  if (texts.guestButton) {
    const guest = createElementWithClass('button', 'block-session-example-button', texts.guestButton);
    guest.type = 'button';
    guest.addEventListener('click', continueAsGuest);
    actions.append(showOnlyForSessionStates(guest, [SESSION_STATES.SIGNED_OUT]));
  }
  if (texts.signOut) {
    const out = createElementWithClass('button', 'block-session-example-button', texts.signOut);
    out.type = 'button';
    out.addEventListener('click', () => logoutUser());
    actions.append(showOnlyForSessionStates(out, [SESSION_STATES.SIGNED_IN, SESSION_STATES.GUEST]));
  }
  return actions.children.length ? actions : null;
}

/**
 * Status panel: title, badge and text of the current state (renderBySessionState) and actions.
 * @param {Object} settings readExampleSettings() result
 * @returns {Element} div.block-session-example-status
 */
function buildExampleStatus(settings) {
  const { texts } = settings;
  const status = createElementWithClass('div', 'block-session-example-status');
  if (texts.statusTitle) {
    status.append(createElementWithClass('div', 'block-session-example-status-title', texts.statusTitle));
  }

  // repainted on every session change; read by screen readers when it changes
  const current = createElementWithClass('div', 'block-session-example-status-current');
  current.setAttribute('aria-live', 'polite');
  const view = (state) => (session) => {
    const content = createElementWithClass('div', 'block-session-example-status-body');
    content.append(buildStateBadge(state));
    const text = buildStateText(texts[state], session);
    if (text) {
      content.append(text);
    }
    return content;
  };
  renderBySessionState(current, {
    [SESSION_STATES.SIGNED_IN]: view(SESSION_STATES.SIGNED_IN),
    [SESSION_STATES.GUEST]: view(SESSION_STATES.GUEST),
    [SESSION_STATES.SIGNED_OUT]: view(SESSION_STATES.SIGNED_OUT),
  });
  status.append(current);

  const actions = buildExampleActions(settings);
  if (actions) {
    status.append(actions);
  }
  return status;
}

/**
 * Fields of the user card, in order; empty values are left out (a guest has no email or
 * phone). Never the token.
 * @param {Object} session getCurrentSession(): the real session or the guest one
 * @returns {string[][]} [label, value] pairs
 */
function readUserFields(session) {
  const user = session?.user || {};
  const labels = LABELS.user;
  const type = user.isGuest ? SESSION_STATES.GUEST : SESSION_STATES.SIGNED_IN;
  return [
    [labels.type, LABELS.states[type]],
    [labels.name, [user.firstName, user.lastName].filter(Boolean).join(' ')],
    [labels.email, user.email],
    [labels.phone, user.phone],
    [labels.userId, user.userId],
    [labels.verified, user.verified ? labels.yes : labels.no],
    [labels.sessionId, session?.sessionId],
  ].filter(([, value]) => value);
}

/**
 * The user data as a table: one row per field (label + value), columns from the grid.
 * @param {Object} session getCurrentSession() result
 * @returns {Element} div.block-session-example-user-table[role=table]
 */
function buildUserTable(session) {
  const table = createElementWithClass('div', 'block-session-example-user-table container-fluid');
  table.setAttribute('role', 'table');
  table.setAttribute('aria-label', LABELS.user.table);
  readUserFields(session).forEach(([label, value]) => {
    const field = createElementWithClass('div', 'block-session-example-user-field row row-gutter-16');
    field.setAttribute('role', 'row');
    const name = createElementWithClass('div', 'block-session-example-user-label col-10 col-md-6 col-lg-4', label);
    name.setAttribute('role', 'rowheader');
    const cell = createElementWithClass('div', 'block-session-example-user-value col-14 col-md-18 col-lg-20', value);
    cell.setAttribute('role', 'cell');
    field.append(name, cell);
    table.append(field);
  });
  return table;
}

/**
 * User data card (only with the User Title row): the data of whoever visits, signed in or
 * guest, repainted when the session changes. Without a session there is nothing to show.
 * @param {Object} settings readExampleSettings() result
 * @returns {Element|null} div.block-session-example-user
 */
function buildExampleUser(settings) {
  if (!settings.texts.userTitle) {
    return null;
  }
  const card = createElementWithClass('div', 'block-session-example-user');
  const title = createElementWithClass('div', 'block-session-example-user-title', settings.texts.userTitle);
  title.setAttribute('role', 'heading');
  title.setAttribute('aria-level', '3');
  const data = createElementWithClass('div', 'block-session-example-user-data');
  data.setAttribute('aria-live', 'polite');
  card.append(title, data);
  renderBySessionState(data, {
    [SESSION_STATES.SIGNED_IN]: buildUserTable,
    [SESSION_STATES.GUEST]: buildUserTable,
  });
  return card;
}

/**
 * One Item card inside its grid column, with a tag that says who sees it.
 * @param {{states: string[], text: string}} item
 * @returns {Element} div.col-24.col-md-12.col-lg-8
 */
function buildExampleItem(item) {
  const card = createElementWithClass('div', 'block-session-example-item');
  const audience = item.states.length
    ? item.states.map((state) => LABELS.states[state]).join(' o ')
    : LABELS.everybody;
  card.append(
    createElementWithClass('div', 'block-session-example-item-tag', `${LABELS.audience} ${audience}`),
    createElementWithClass('div', 'block-session-example-item-text', item.text),
  );
  const col = createElementWithClass('div', 'col-24 col-md-12 col-lg-8');
  col.append(card);
  return col;
}

/**
 * Private call (REQUEST_TYPE.PRIVATE, Bearer token) painted only with a session.
 * @param {Object} settings readExampleSettings() result
 * @returns {Element|null} div.block-session-example-private
 */
function buildExamplePrivate(settings) {
  if (!settings.privateEndpoint) {
    return null;
  }
  const panel = createElementWithClass('div', 'block-session-example-private');
  if (settings.texts.privateTitle) {
    panel.append(createElementWithClass('div', 'block-session-example-private-title', settings.texts.privateTitle));
  }
  const result = createElementWithClass('div', 'block-session-example-private-result');
  result.setAttribute('aria-live', 'polite');
  panel.append(result);

  renderBySessionState(result, {
    [SESSION_STATES.SIGNED_IN]: () => {
      const answer = createElementWithClass('div', 'block-session-example-private-text');
      post(settings.privateEndpoint, {
        meta: PRIVATE_REQUEST_META,
        // the private interceptor puts the Bearer token in security.auth.value
        security: { auth: { type: 'Bearer', value: '' } },
        data: {},
      }, { interceptor: REQUEST_TYPE.PRIVATE })
        .then((response) => {
          answer.textContent = response?.status?.message || JSON.stringify(response?.data ?? {});
        })
        .catch((error) => {
          answer.textContent = error?.cause?.status?.message || MESSAGES.errorResponseMessage;
        });
      return answer;
    },
  });
  return panel;
}

/**
 * Paints the block inside the grid: title, status, user data, items and private call.
 * @param {Element} block
 * @param {Object} settings readExampleSettings() result
 */
function renderSessionExample(block, settings) {
  const row = createElementWithClass('div', 'row row-gutter-16 row-gutter-y-16');
  const fullWidth = (content) => {
    const col = createElementWithClass('div', 'col-24');
    col.append(content);
    return col;
  };

  if (settings.texts.title) {
    const title = createElementWithClass('div', 'block-session-example-title', settings.texts.title);
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '2');
    row.append(fullWidth(title));
  }
  row.append(fullWidth(buildExampleStatus(settings)));
  const userCard = buildExampleUser(settings);
  // the user card only exists for signed-in and guest visitors
  if (userCard) {
    row.append(showOnlyForSessionStates(
      fullWidth(userCard),
      [SESSION_STATES.SIGNED_IN, SESSION_STATES.GUEST],
    ));
  }
  row.append(...settings.items.map(buildExampleItem));
  const privatePanel = buildExamplePrivate(settings);
  // the whole private panel only exists for signed-in visitors
  if (privatePanel) {
    row.append(showOnlyForSessionStates(fullWidth(privatePanel), [SESSION_STATES.SIGNED_IN]));
  }

  const container = createElementWithClass('div', 'container-fluid');
  container.append(row);
  block.replaceChildren(container);
}

/**
 * Block Session Example. The block name gives the main .block-session-example class that
 * scopes every style.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // Styles / Classname / Session rows and session rows, before reading
  renderSessionExample(block, readExampleSettings(block));
}
