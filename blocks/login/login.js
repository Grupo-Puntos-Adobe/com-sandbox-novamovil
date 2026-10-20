/*
 * Login block: "Identifica tu cuenta" with two tabs, Iniciar sesión (form) and Crear cuenta
 * (its panel stays empty: the register block comes later). One tab panel is shown at a time.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every "Login"
 * table (page /login).
 *
 * Authored rows (all optional): Styles, Classname, Title, Description, Login Tab,
 * Register Tab, Endpoint, User Label, User Placeholder, Password Label, Password Placeholder,
 * Forgot Password (link), Button Text, Divider Text, Guest Button (link), Legal Text (text with
 * links).
 * Defaults only for messages and configuration: every row is content, so without text in the
 * table that part is not painted. Special cases:
 *   - Tabs: only when Login Tab and Register Tab both have text; otherwise only the login
 *     panel is shown.
 *   - User / Password Label missing: the field keeps an accessible name (LABELS below).
 *   - Divider: only between Button Text and Guest Button (both painted).
 *   - Endpoint: read now, empty for the moment. The login service does not exist yet, so the
 *     submit only stops the page reload (handleLoginSubmit); the request goes there.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)      Styles / Classname rows
 *     ├─ readLoginSettings(block)      texts, links, endpoint, legal cell
 *     └─ renderLogin()
 *          ├─ buildLoginHeader()       title + description
 *          ├─ buildLoginTabs()         tablist (arrows / Home / End move between tabs)
 *          ├─ buildLoginForm()         fields, forgot link, submit, divider, guest link
 *          │    └─ submit → handleLoginSubmit() (no service yet: no reload, nothing sent)
 *          ├─ register panel           empty (register block, later)
 *          └─ buildLegalText()         authored text, links rebuilt with getSafeHref
 *
 * No resolution logic here: login.css decides each resolution. Columns come from the grid
 * (styles/foundations/grid.css): container-fluid > row row-center > col-24 (login-frame).
 *
 * Markup is divs with ARIA roles, except what a form needs to work (form, label, input,
 * button: autofill, password managers, Enter to submit) and the links (<a>).
 * Guide: blocks/login/README.md
 */
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { readTableCell, getSafeHref } from '../../scripts/foundations/block-utils.js';

// accessible names when the table has no label (only read by screen readers)
const LABELS = {
  user: 'Correo electrónico o teléfono',
  password: 'Contraseña',
  tabs: 'Opciones de cuenta',
};
// ids must be unique if a page has more than one Login block
let loginBlockCount = 0;

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
 * Value cell of a row (the whole cell, to keep the links of Legal Text).
 * @param {Element} block
 * @param {string} rowName Row name, case-insensitive
 * @returns {Element|null}
 */
function findValueCell(block, rowName) {
  const row = [...block.querySelectorAll(':scope > div')].find(
    (candidate) => candidate.children[0]?.textContent.trim().toLowerCase() === rowName,
  );
  return row?.children[1] || null;
}

/**
 * Everything the block paints, read from the table before it is replaced.
 * @param {Element} block
 * @returns {Object}
 */
function readLoginSettings(block) {
  const readCellText = (key) => readTableCell(block, key).text;
  const readLink = (key) => {
    const cell = readTableCell(block, key);
    return { text: cell.text, href: getSafeHref(cell.href) };
  };
  const endpointCell = readTableCell(block, 'endpoint');
  return {
    texts: {
      title: readCellText('title'),
      description: readCellText('description'),
      loginTab: readCellText('login tab'),
      registerTab: readCellText('register tab'),
      userLabel: readCellText('user label'),
      userPlaceholder: readCellText('user placeholder'),
      passwordLabel: readCellText('password label'),
      passwordPlaceholder: readCellText('password placeholder'),
      button: readCellText('button text'),
      divider: readCellText('divider text'),
    },
    forgotPassword: readLink('forgot password'),
    guest: readLink('guest button'),
    endpoint: endpointCell.href || endpointCell.text,
    legalCell: findValueCell(block, 'legal text'),
  };
}

/**
 * Title (page heading) and description; null when both are empty.
 * @param {Object} texts
 * @returns {Element|null} div.login-header
 */
function buildLoginHeader(texts) {
  if (!texts.title && !texts.description) return null;
  const header = createElementWithClass('div', 'login-header');
  if (texts.title) {
    const title = createElementWithClass('div', 'login-title', texts.title);
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '1');
    header.append(title);
  }
  if (texts.description) {
    header.append(createElementWithClass('div', 'login-description', texts.description));
  }
  return header;
}

/**
 * Shows one panel and marks its tab; the other tab leaves the Tab key order.
 * @param {Element[]} tabs
 * @param {Element[]} panels Same order as tabs
 * @param {number} index Tab to show
 */
function selectLoginTab(tabs, panels, index) {
  tabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[tabIndex].hidden = !selected;
  });
}

/**
 * Tablist "Iniciar sesión | Crear cuenta" (WAI-ARIA tabs: click, arrows, Home, End).
 * @param {string[]} labels Tab texts, same order as panels
 * @param {Element[]} panels div.login-panel, already with their id
 * @returns {Element} div.login-tabs[role=tablist]
 */
function buildLoginTabs(labels, panels) {
  const tablist = createElementWithClass('div', 'login-tabs');
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', LABELS.tabs);
  const tabs = labels.map((label, index) => {
    const tab = createElementWithClass('button', 'login-tab', label);
    tab.type = 'button';
    tab.id = `${panels[index].id}-tab`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => selectLoginTab(tabs, panels, index));
    return tab;
  });
  tablist.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    const moves = {
      ArrowRight: (current + 1) % tabs.length,
      ArrowLeft: (current - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    selectLoginTab(tabs, panels, moves[event.key]);
    tabs[moves[event.key]].focus();
  });
  tablist.append(...tabs);
  selectLoginTab(tabs, panels, 0);
  return tablist;
}

/**
 * One form field: label (when authored) + input.
 * @param {Object} field
 * @param {string} field.id
 * @param {string} field.name
 * @param {string} field.type
 * @param {string} field.autocomplete
 * @param {string} field.label Authored label ('' → aria-label with the fallback)
 * @param {string} field.fallbackLabel Accessible name when there is no label
 * @param {string} field.placeholder
 * @returns {Element} div.login-field
 */
function buildLoginField({
  id, name, type, autocomplete, label, fallbackLabel, placeholder,
}) {
  const field = createElementWithClass('div', 'login-field');
  const input = createElementWithClass('input', 'login-input');
  Object.assign(input, {
    id, name, type, autocomplete,
  });
  if (placeholder) input.placeholder = placeholder;
  if (label) {
    const labelNode = createElementWithClass('label', 'login-label', label);
    labelNode.htmlFor = id;
    field.append(labelNode);
  } else {
    input.setAttribute('aria-label', fallbackLabel);
  }
  field.append(input);
  return field;
}

/**
 * Submit of the login form. The login service does not exist yet: the page must not reload
 * and nothing is sent. When it exists, the POST to settings.endpoint (Endpoint row) goes here.
 * @param {SubmitEvent} event
 */
function handleLoginSubmit(event) {
  event.preventDefault();
}

/**
 * The login form: user, password, forgot link, submit, divider and guest link.
 * @param {string} idPrefix Unique prefix for the field ids
 * @param {Object} settings readLoginSettings() result
 * @returns {Element} form.login-form
 */
function buildLoginForm(idPrefix, settings) {
  const { texts, forgotPassword, guest } = settings;
  const form = createElementWithClass('form', 'login-form');
  form.noValidate = true;
  form.append(
    buildLoginField({
      id: `${idPrefix}-user`,
      name: 'user',
      type: 'text',
      autocomplete: 'username',
      label: texts.userLabel,
      fallbackLabel: LABELS.user,
      placeholder: texts.userPlaceholder,
    }),
    buildLoginField({
      id: `${idPrefix}-password`,
      name: 'password',
      type: 'password',
      autocomplete: 'current-password',
      label: texts.passwordLabel,
      fallbackLabel: LABELS.password,
      placeholder: texts.passwordPlaceholder,
    }),
  );

  if (forgotPassword.text && forgotPassword.href) {
    const forgot = createElementWithClass('div', 'login-forgot');
    const link = createElementWithClass('a', 'login-forgot-link', forgotPassword.text);
    link.href = forgotPassword.href;
    forgot.append(link);
    form.append(forgot);
  }

  if (texts.button) {
    const submit = createElementWithClass('button', 'login-submit', texts.button);
    submit.type = 'submit';
    form.append(submit);
  }

  const hasGuest = guest.text && guest.href;
  if (texts.button && hasGuest) {
    const divider = createElementWithClass('div', 'login-divider');
    divider.setAttribute('role', 'separator');
    if (texts.divider) divider.append(createElementWithClass('div', 'login-divider-text', texts.divider));
    form.append(divider);
  }
  if (hasGuest) {
    const guestLink = createElementWithClass('a', 'login-guest', guest.text);
    guestLink.href = guest.href;
    form.append(guestLink);
  }

  form.addEventListener('submit', handleLoginSubmit);
  return form;
}

/**
 * Legal Text as authored: its text, and its links rebuilt (only safe hrefs; bold / italic
 * are left to the CSS). Null when the cell is empty.
 * @param {Element|null} cell
 * @returns {Element|null} div.login-legal
 */
function buildLegalText(cell) {
  if (!cell?.textContent.trim()) return null;
  const legal = createElementWithClass('div', 'login-legal');
  const appendNodes = (nodes) => nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      legal.append(node.textContent);
    } else if (node.nodeName === 'A') {
      const href = getSafeHref(node.getAttribute('href'));
      const text = node.textContent.trim();
      if (!href) {
        legal.append(text);
        return;
      }
      const link = createElementWithClass('a', 'login-legal-link', text);
      link.href = href;
      legal.append(link);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // paragraphs of the cell are joined with a space
      if (['P', 'DIV'].includes(node.nodeName) && legal.childNodes.length) legal.append(' ');
      appendNodes([...node.childNodes]);
    }
  });
  appendNodes([...cell.childNodes]);
  legal.normalize();
  return legal;
}

/**
 * Paints the block: header, tabs, the two panels and the legal text inside the grid.
 * @param {Element} block
 * @param {Object} settings readLoginSettings() result
 */
function renderLogin(block, settings) {
  loginBlockCount += 1;
  const idPrefix = `login-${loginBlockCount}`;
  const { texts } = settings;

  const loginPanel = createElementWithClass('div', 'login-panel login-panel-login');
  loginPanel.id = `${idPrefix}-login`;
  loginPanel.append(buildLoginForm(idPrefix, settings));

  const frame = createElementWithClass('div', 'col-24 login-frame');
  const header = buildLoginHeader(texts);
  if (header) frame.append(header);

  if (texts.loginTab && texts.registerTab) {
    // empty for now: the register block will be placed here
    const registerPanel = createElementWithClass('div', 'login-panel login-panel-register');
    registerPanel.id = `${idPrefix}-register`;
    frame.append(
      buildLoginTabs([texts.loginTab, texts.registerTab], [loginPanel, registerPanel]),
      loginPanel,
      registerPanel,
    );
  } else {
    frame.append(loginPanel);
  }

  const legal = buildLegalText(settings.legalCell);
  if (legal) frame.append(legal);

  const row = createElementWithClass('div', 'row row-center');
  row.append(frame);
  const container = createElementWithClass('div', 'container-fluid');
  container.append(row);
  block.replaceChildren(container);
}

/**
 * Login. The block name gives the main .login class that scopes every style.
 * @param {Element} block The login block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the table
  renderLogin(block, readLoginSettings(block));
}
