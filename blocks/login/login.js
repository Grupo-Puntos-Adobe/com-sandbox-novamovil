/*
 * Login block: "Identifica tu cuenta" with two tabs, Iniciar sesión (form) and Crear cuenta
 * (its panel stays empty: the register block comes later). One tab panel is shown at a time.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every "Login"
 * table (page /login).
 *
 * Authored rows (all optional): Styles, Classname, Session, Title, Description, Login Tab,
 * Register Tab, Endpoint, User Label,
 * User Placeholder, Password Label, Password Placeholder, Forgot Password (link), Button Text,
 * Divider Text, Guest Button (text, optional link), Legal Text (text with links),
 * Error Response Message.
 * Defaults only for messages and configuration; the rest is content, so without text in the
 * table that part is not painted. Special cases:
 *   - Tabs: only when Login Tab and Register Tab both have text; otherwise only the login
 *     panel is shown.
 *   - User / Password Label missing: the field keeps an accessible name (LABELS below).
 *   - Divider: only between Button Text and Guest Button (both painted).
 *   - Endpoint: login service (POST). Without it the submit only stops the page reload.
 *   - Redirects are NOT here: the page decides them in its Metadata (Session false +
 *     Redirect To on /login: with a session, also right after signing in, the page goes to
 *     Redirect To; see applyPageSessionRule in scripts/foundations/session.js). The block only
 *     logs in and hides itself once signed in (unless the table has its own Session row). On
 *     the login page (Metadata Session false) a guest still sees it; on a checkout step (page
 *     without Session in its Metadata) a guest has done the step, so it hides too
 *     (SESSION_CHANGE_EVENT).
 *   - Guest Button: continueAsGuest(), then its link; without link it stays (the step is done)
 *     and is painted as a button.
 *   Nothing is read from or added to the URL.
 *   - Error Response Message: shown when the service fails without a message of its own
 *     (default errorResponseMessage of scripts/foundations/messages.js, also when empty).
 *
 * Login request: loginUser(Endpoint, { meta, security, data: { emailOrPhone, password } })
 * (scripts/foundations/session.js makes the POST and stores the session); meta and
 * security are fixed (LOGIN_REQUEST_META, LOGIN_REQUEST_SECURITY), as the service expects.
 * For now data is always FIXED_CREDENTIALS (the mock user); set SEND_FORM_CREDENTIALS to true
 * to send what the user types (readLoginCredentials). Answers:
 *   200 → session stored by loginUser(): the block hides itself and the page
 *         Metadata decides where to go. The nextStep.route of the service is not used.
 *   400 → each errors[].field message under its field + status.message on top
 *   401 / 500 / no answer → status.message (+ errors without field) on top, or
 *         Error Response Message
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)      Styles / Classname / Session rows
 *     ├─ readLoginSettings(block)      texts, links, endpoint, legal cell
 *     ├─ Session signed-out on the block (sessions.css): hidden once signed in or guest
 *     └─ renderLogin()
 *          ├─ buildLoginHeader()       title + description
 *          ├─ buildLoginTabs()         tablist (arrows / Home / End move between tabs)
 *          ├─ buildLoginForm()         alert, fields, forgot link, submit, divider, guest link
 *          │    ├─ submit → submitLogin()   loginUser(endpoint, body), or messages
 *          │    └─ guest  → continueAsGuest() + getGuestDestination()
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
import MESSAGES from '../../scripts/foundations/messages.js';
import {
  PAGE_SESSION_RULES, SESSION_STATES, continueAsGuest, readPageSessionRule, goToPage,
  loginUser, showOnlyForSessionStates, toSafeSitePath,
} from '../../scripts/foundations/session.js';

// fixed parts of the login request (only data changes)
const LOGIN_REQUEST_META = {
  requestId: 'REQ-AUTH-LOGIN-001',
  correlationId: 'CORR-AUTH-001',
  timestamp: '2026-10-20T18:00:00Z',
  channel: 'WEB',
  platform: 'DESKTOP',
};
const LOGIN_REQUEST_SECURITY = {
  auth: { type: 'Bearer', value: 'Bearer {{bearer_token}}' },
  nonce: 'NONCE-REQ-AUTH-LOGIN-001',
  signature: '{{hmac_signature}}',
};
// false while the service is a mock: every login sends FIXED_CREDENTIALS (the mock user).
// true → sends what the user types in the form (readLoginCredentials).
const SEND_FORM_CREDENTIALS = false;
const FIXED_CREDENTIALS = { emailOrPhone: 'cliente@ejemplo.com', password: 'Password123' };
// form fields, named as the service names them (errors[].field)
const FORM_FIELDS = ['emailOrPhone', 'password'];

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
  if (content !== undefined) {
    node.textContent = content;
  }
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
    errorResponseMessage: readCellText('error response message') || MESSAGES.errorResponseMessage,
    legalCell: findValueCell(block, 'legal text'),
  };
}

/**
 * Title (page heading) and description; null when both are empty.
 * @param {Object} texts
 * @returns {Element|null} div.login-header
 */
function buildLoginHeader(texts) {
  if (!texts.title && !texts.description) {
    return null;
  }
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
    if (current < 0) {
      return;
    }
    const moves = {
      ArrowRight: (current + 1) % tabs.length,
      ArrowLeft: (current - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in moves)) {
      return;
    }
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
  if (placeholder) {
    input.placeholder = placeholder;
  }
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
 * Credentials of the request: FIXED_CREDENTIALS for now, or what the user typed when
 * SEND_FORM_CREDENTIALS is true.
 * @param {HTMLFormElement} form
 * @returns {{emailOrPhone: string, password: string}}
 */
function readLoginCredentials(form) {
  if (!SEND_FORM_CREDENTIALS) {
    return { ...FIXED_CREDENTIALS };
  }
  return {
    emailOrPhone: form.elements.emailOrPhone.value.trim(),
    password: form.elements.password.value,
  };
}

/**
 * Message on top of the form (error or success); '' hides it.
 * @param {HTMLFormElement} form
 * @param {string} message
 * @param {'error'|'success'} [variant='error']
 */
function showLoginAlert(form, message, variant = 'error') {
  const alert = form.querySelector('.login-alert');
  alert.className = `login-alert login-alert-${variant}`;
  alert.textContent = message;
  alert.hidden = !message;
}

/**
 * Message under one field; the field is marked invalid and points to it.
 * @param {HTMLFormElement} form
 * @param {string} fieldName emailOrPhone | password
 * @param {string} message
 */
function showFieldError(form, fieldName, message) {
  const input = form.elements[fieldName];
  const field = input.closest('.login-field');
  let error = field.querySelector('.login-field-error');
  if (!error) {
    error = createElementWithClass('div', 'login-field-error');
    error.id = `${input.id}-error`;
    field.append(error);
  }
  error.textContent = message;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', error.id);
}

/**
 * Removes the message of one field.
 * @param {HTMLInputElement} input
 */
function clearFieldError(input) {
  input.closest('.login-field')?.querySelector('.login-field-error')?.remove();
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
}

/**
 * Removes every message of the form.
 * @param {HTMLFormElement} form
 */
function clearLoginErrors(form) {
  showLoginAlert(form, '');
  form.querySelectorAll('.login-input').forEach(clearFieldError);
}

/**
 * While the request runs: the form is busy and the button cannot be pressed again.
 * @param {HTMLFormElement} form
 * @param {boolean} busy
 */
function setLoginBusy(form, busy) {
  form.setAttribute('aria-busy', String(busy));
  const submit = form.querySelector('.login-submit');
  if (submit) {
    submit.disabled = busy;
  }
}

/**
 * What to show for a failed login, from the error body of the service
 * ({ status: { message }, errors: [{ field, message }] }).
 * @param {Error} error ApiError (its cause is the error body, see publicRequestInterceptor)
 * @param {string} fallbackMessage Error Response Message
 * @returns {{message: string, fields: {field: string, message: string}[]}}
 */
function readLoginErrors(error, fallbackMessage) {
  const body = error?.cause && typeof error.cause === 'object' && !(error.cause instanceof Error)
    ? error.cause : null;
  const errors = (Array.isArray(body?.errors) ? body.errors : [])
    .filter((item) => typeof item?.message === 'string' && item.message.trim());
  const fields = errors.filter((item) => FORM_FIELDS.includes(item.field));
  const message = [body?.status?.message, ...errors
    .filter((item) => !FORM_FIELDS.includes(item.field))
    .map((item) => item.message)]
    .filter((text) => typeof text === 'string' && text.trim())
    .join(' ');
  return { message: message || (fields.length ? '' : fallbackMessage), fields };
}

/**
 * Where a guest goes: the link of Guest Button; '' = stay (the step is done).
 * @param {Object} settings readLoginSettings() result
 * @returns {string}
 */
function getGuestDestination(settings) {
  return toSafeSitePath(settings.guest.href);
}

/**
 * Sends the login through loginUser() (scripts/foundations/session.js), which makes the
 * request and stores the session. 200 → the block hides itself and the page Metadata decides
 * where to go; any error → messages on the form. Without Endpoint nothing is sent.
 * @param {HTMLFormElement} form
 * @param {Object} settings readLoginSettings() result
 */
async function submitLogin(form, settings) {
  if (form.getAttribute('aria-busy') === 'true') {
    return;
  }
  clearLoginErrors(form);
  if (!settings.endpoint) {
    return;
  }

  setLoginBusy(form, true);
  try {
    await loginUser(settings.endpoint, {
      meta: LOGIN_REQUEST_META,
      security: LOGIN_REQUEST_SECURITY,
      data: readLoginCredentials(form),
    });
    // the block is hidden now (signed-out only); leave it clean for a later sign out
    form.reset();
    setLoginBusy(form, false);
  } catch (error) {
    const { message, fields } = readLoginErrors(error, settings.errorResponseMessage);
    fields.forEach(({ field, message: fieldMessage }) => showFieldError(form, field, fieldMessage));
    showLoginAlert(form, message);
    setLoginBusy(form, false);
    // the disabled button lost the focus: go to the first field to fix
    form.querySelector('.login-input[aria-invalid="true"]')?.focus();
  }
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
  // messages of the service (role=alert: read as soon as they appear)
  const alert = createElementWithClass('div', 'login-alert');
  alert.setAttribute('role', 'alert');
  alert.hidden = true;
  form.append(
    alert,
    buildLoginField({
      id: `${idPrefix}-user`,
      name: 'emailOrPhone',
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

  const hasGuest = Boolean(guest.text);
  if (texts.button && hasGuest) {
    const divider = createElementWithClass('div', 'login-divider');
    divider.setAttribute('role', 'separator');
    if (texts.divider) {
      divider.append(createElementWithClass('div', 'login-divider-text', texts.divider));
    }
    form.append(divider);
  }
  if (hasGuest) {
    // a link when the table has one (works without JS too), else a button
    const guestAction = createElementWithClass(guest.href ? 'a' : 'button', 'login-guest', guest.text);
    if (guest.href) {
      guestAction.href = guest.href;
    } else {
      guestAction.type = 'button';
    }
    guestAction.addEventListener('click', (event) => {
      event.preventDefault();
      continueAsGuest();
      const destination = getGuestDestination(settings);
      if (destination) {
        goToPage(destination);
      }
    });
    form.append(guestAction);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitLogin(form, settings);
  });
  // a field that changes loses its error message
  form.addEventListener('input', (event) => {
    if (event.target.classList.contains('login-input')) {
      clearFieldError(event.target);
    }
  });
  return form;
}

/**
 * Legal Text as authored: its text, and its links rebuilt (only safe hrefs; bold / italic
 * are left to the CSS). Null when the cell is empty.
 * @param {Element|null} cell
 * @returns {Element|null} div.login-legal
 */
function buildLegalText(cell) {
  if (!cell?.textContent.trim()) {
    return null;
  }
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
      if (['P', 'DIV'].includes(node.nodeName) && legal.childNodes.length) {
        legal.append(' ');
      }
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
  if (header) {
    frame.append(header);
  }

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
  if (legal) {
    frame.append(legal);
  }

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
  applyBlockOptions(block); // Styles / Classname / Session rows and session rows, before reading
  const settings = readLoginSettings(block);

  // hidden once signed in (an authored Session row wins). On the login page (Metadata
  // Session false) a guest still sees it, to sign in; on a checkout step a guest has done
  // the step, so it hides too.
  const wrapper = block.parentElement?.classList.contains('login-wrapper')
    ? block.parentElement : block;
  if (!wrapper.classList.contains('session-only')) {
    const isLoginPage = readPageSessionRule() === PAGE_SESSION_RULES.SIGNED_OUT_ONLY;
    showOnlyForSessionStates(wrapper, isLoginPage
      ? [SESSION_STATES.SIGNED_OUT, SESSION_STATES.GUEST]
      : [SESSION_STATES.SIGNED_OUT]);
  }
  renderLogin(block, settings);
}
