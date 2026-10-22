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
 *   2. Status panel: renderForSession() paints the badge and the text of the current state
 *      ("Hola, {name}…" with the user of the session) and repaints them when it changes.
 *   3. Items by session, the generic way of ANY block: "Item | text | signed-in" (the state in
 *      the LAST cell). applySessionRows() (block-options.js) removes the rows of other states
 *      before this block reads its table, and the page reloads when the session changes.
 *   4. Actions: Iniciar sesión (link to the login with ?redirect= back here), Continuar como
 *      invitado (continueAsGuest) and Cerrar sesión (signOut), each one only for its state.
 *   5. Private call: with Private Endpoint and a session, post(…, REQUEST_TYPE.PRIVATE) sends
 *      the Bearer token and shows the answer of the service.
 *
 * Authored rows (all optional): Styles, Classname, Session, Title, Status Title,
 * Signed In Text ({name} = first name), Guest Text, Signed Out Text, Item (text, any number),
 * Login Link (link), Guest Button Text, Sign Out Text, Private Title, Private Endpoint.
 * Content rows have no default: without text that part is not painted. Any row can end with a
 * state cell (signed-in | guest | signed-out, combined with commas); without it, everybody.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)          Styles / Classname / Session rows
 *     ├─ readExampleSettings(block)        texts, items, links, endpoint
 *     └─ renderSessionExample()
 *          ├─ buildExampleStatus()         renderForSession: badge + text, actions by session
 *          ├─ buildExampleItem() × N       the Item rows left for the current state
 *          └─ buildExamplePrivate()        renderForSession: private call when signed in
 *
 * No resolution logic here: block-session-example.css decides each resolution. Columns come
 * from the grid (styles/foundations/grid.css):
 *   container-fluid > row row-gutter-16 row-gutter-y-16 > col-24 (title, status, private)
 *                                                       + col-24 col-md-12 col-lg-8 (items)
 * Markup is divs with ARIA roles, except the links (<a>) and the buttons (<button>).
 * Guide: blocks/block-session-example/README.md
 */
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { readTableCell } from '../../scripts/foundations/block-utils.js';
import MESSAGES from '../../scripts/foundations/messages.js';
import {
  REDIRECT_PARAM, SESSION_STATES, continueAsGuest, parseSessionStates, renderForSession,
  setSessionVisibility, signOut, toSitePath,
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
  if (content !== undefined) node.textContent = content;
  return node;
}

/**
 * "Item" rows left for the current state (applySessionRows already removed the others), in
 * authored order; states = who sees it (row.dataset.session, empty = everybody).
 * @param {Element} block
 * @returns {{states: string[], text: string}[]}
 */
function readItemRows(block) {
  return [...block.querySelectorAll(':scope > div')]
    .filter((row) => row.children[0]?.textContent.trim().toLowerCase() === ITEM_ROW)
    .map((row) => ({
      states: parseSessionStates(row.dataset.session),
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
  const endpointCell = readTableCell(block, 'private endpoint');
  return {
    texts: {
      title: readCellText('title'),
      statusTitle: readCellText('status title'),
      [SESSION_STATES.SIGNED_IN]: readCellText('signed in text'),
      [SESSION_STATES.GUEST]: readCellText('guest text'),
      [SESSION_STATES.SIGNED_OUT]: readCellText('signed out text'),
      guestButton: readCellText('guest button text'),
      signOut: readCellText('sign out text'),
      privateTitle: readCellText('private title'),
    },
    login: { text: loginCell.text, href: toSitePath(loginCell.href || loginCell.text) },
    items: readItemRows(block),
    privateEndpoint: endpointCell.href || endpointCell.text,
  };
}

/**
 * Link to the login that comes back to this page after signing in (?redirect=).
 * @param {string} loginPath e.g. /login
 * @returns {string}
 */
function buildLoginHref(loginPath) {
  const url = new URL(loginPath, window.location.origin);
  url.searchParams.set(REDIRECT_PARAM, `${window.location.pathname}${window.location.search}`);
  return `${url.pathname}${url.search}`;
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
  if (!text) return null;
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
    link.href = buildLoginHref(login.href);
    actions.append(setSessionVisibility(link, [SESSION_STATES.SIGNED_OUT]));
  }
  if (texts.guestButton) {
    const guest = createElementWithClass('button', 'block-session-example-button', texts.guestButton);
    guest.type = 'button';
    guest.addEventListener('click', continueAsGuest);
    actions.append(setSessionVisibility(guest, [SESSION_STATES.SIGNED_OUT]));
  }
  if (texts.signOut) {
    const out = createElementWithClass('button', 'block-session-example-button', texts.signOut);
    out.type = 'button';
    out.addEventListener('click', signOut);
    actions.append(setSessionVisibility(out, [SESSION_STATES.SIGNED_IN, SESSION_STATES.GUEST]));
  }
  return actions.children.length ? actions : null;
}

/**
 * Status panel: title, badge and text of the current state (renderForSession) and actions.
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
    if (text) content.append(text);
    return content;
  };
  renderForSession(current, {
    [SESSION_STATES.SIGNED_IN]: view(SESSION_STATES.SIGNED_IN),
    [SESSION_STATES.GUEST]: view(SESSION_STATES.GUEST),
    [SESSION_STATES.SIGNED_OUT]: view(SESSION_STATES.SIGNED_OUT),
  });
  status.append(current);

  const actions = buildExampleActions(settings);
  if (actions) status.append(actions);
  return status;
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
  if (!settings.privateEndpoint) return null;
  const panel = createElementWithClass('div', 'block-session-example-private');
  if (settings.texts.privateTitle) {
    panel.append(createElementWithClass('div', 'block-session-example-private-title', settings.texts.privateTitle));
  }
  const result = createElementWithClass('div', 'block-session-example-private-result');
  result.setAttribute('aria-live', 'polite');
  panel.append(result);

  renderForSession(result, {
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
 * Paints the block inside the grid: title, status, items and private call.
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
  row.append(...settings.items.map(buildExampleItem));
  const privatePanel = buildExamplePrivate(settings);
  // the whole private panel only exists for signed-in visitors
  if (privatePanel) {
    row.append(setSessionVisibility(fullWidth(privatePanel), [SESSION_STATES.SIGNED_IN]));
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
  applyBlockOptions(block); // optional Styles / Classname / Session rows, before reading
  renderSessionExample(block, readExampleSettings(block));
}
