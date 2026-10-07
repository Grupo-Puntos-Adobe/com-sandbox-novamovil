/*
 * NovaMóvil header (template block, rewritten). All styles are scoped under .header-novamovil.
 *
 * Entry point: decorate(block), called by loadHeader() (scripts/aem.js) from loadLazy()
 * in scripts/scripts.js, on every page.
 *
 * Content: the "nav" document (or the page's `nav` metadata), 3 sections:
 *   1. brand (logo + wordmark)   2. section links   3. tools (Mi cuenta / Carrito links)
 *
 * Flow:
 *   decorate(block)
 *     ├─ loadFragment(navPath)        blocks/fragment/fragment.js → nav document sections
 *     ├─ .nav-brand    → buildBrandLink(section, 'nav-brand')   (brand functions in this file)
 *     ├─ .nav-tools    → reads authored cuenta/carrito hrefs (else TOOL_DEFAULTS), then:
 *     │                   buildSearchBox()  → toggleSearchBox()
 *     │                   buildHeaderToolLink() × 2 (user, cart + badge)
 *     │                   hamburger      → toggleMobileMenu()
 *     └─ listeners: Escape → closeOnEscapeKey(); section link click → toggleMobileMenu(nav, false)
 *
 * No resolution logic here: header.css decides what each resolution shows with the names of
 * styles/foundations/breakpoints.css (hamburger on mobile/tablet, horizontal menu on desktop,
 * page scroll locked while the mobile menu is open). JS only toggles aria-expanded.
 *
 * Classes used by header.css (no tag selectors): nav-bar (+ is-open), nav-brand-*, nav-sections,
 * nav-menu, nav-menu-item (+ has-link), nav-menu-link, nav-tools, nav-tool(-user|-cart),
 * nav-tool-badge, nav-icon, nav-search(-field|-input|-clear|-toggle), nav-hamburger(-button|-icon),
 * and has-header-menu-open on <body> while the mobile menu is open.
 *
 * Output: header > div.header.header-novamovil > div.nav-wrapper > nav#nav.nav-bar
 * Guide: blocks/header/README.md
 */
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/* --------------------------------------------------------------------------
 * Brand (logo + wordmark as one home link). The same code lives in
 * blocks/footer/footer.js: if you change the brand, change it in both blocks.
 * -------------------------------------------------------------------------- */

// brand used when the authored document has no logo image / no brand text
const BRAND_NAME = 'NovaMóvil';
const BRAND_ACCENT = 'Móvil';

/**
 * Builds the wordmark. Keeps the authored markup (incl. <em>); if the author
 * did not emphasise anything, the trailing "Móvil" gets the accent colour.
 * @param {string} authoredName Authored wordmark markup, or empty for the default
 * @param {string} prefix Class prefix of the calling block (e.g. 'nav-brand')
 * @returns {Element} the `${prefix}-name` span
 */
function buildBrandWordmark(authoredName, prefix) {
  const name = document.createElement('span');
  name.className = `${prefix}-name`;
  name.innerHTML = authoredName || BRAND_NAME;
  if (!name.querySelector('em') && name.textContent.trim().endsWith(BRAND_ACCENT)) {
    const text = name.textContent.trim();
    const em = document.createElement('em');
    em.textContent = BRAND_ACCENT;
    name.replaceChildren(text.slice(0, -BRAND_ACCENT.length), em);
  }
  // class hooks so the block CSS never styles tags: `${prefix}-accent`
  name.querySelectorAll('em').forEach((em) => em.classList.add(`${prefix}-accent`));
  return name;
}

/**
 * Builds the brand as a single home link from the authored markup.
 * - logo: the authored image; else the authored :logo: icon; else the default icon
 * - wordmark: the authored text; else "NovaMóvil" (omitted when an image stands alone)
 * The default logo is painted by CSS from the colour tokens, so its <img> is dropped.
 * @param {Element} brandSource Element holding the authored logo/wordmark (consumed)
 * @param {string} prefix Class prefix of the calling block (e.g. 'nav-brand')
 * @returns {Element} the `${prefix}-link` anchor
 */
function buildBrandLink(brandSource, prefix) {
  const authoredLink = brandSource.querySelector('a');
  const picture = brandSource.querySelector('picture');
  const icon = brandSource.querySelector('.icon');
  [picture, icon].forEach((element) => element?.remove());

  // authored wordmark: first link/paragraph that still has letters once the logo is removed
  const textSource = [authoredLink, ...brandSource.querySelectorAll('p')]
    .find((element) => element && /\p{L}/u.test(element.textContent));
  const authoredName = textSource ? textSource.innerHTML.trim() : '';

  const link = document.createElement('a');
  link.className = `${prefix}-link`;
  link.href = authoredLink ? authoredLink.getAttribute('href') : '/';

  if (picture) {
    picture.classList.add(`${prefix}-logo`);
    const img = picture.querySelector('img');
    if (img) img.classList.add(`${prefix}-image`);
    if (img && !img.alt) img.alt = authoredName ? '' : BRAND_NAME;
    link.append(picture);
  } else {
    const logo = icon || document.createElement('span');
    logo.className = `icon icon-logo ${prefix}-logo`;
    logo.replaceChildren();
    link.append(logo);
  }

  if (authoredName || !picture) link.append(buildBrandWordmark(authoredName, prefix));
  return link;
}

// tool links (author can override the labels/urls in the nav document tools section)
const TOOL_DEFAULTS = {
  cuenta: '/cuenta',
  carrito: '/carrito',
};

/**
 * Escape closes the open search first, then the mobile menu (focus returns to the hamburger).
 * @param {KeyboardEvent} event
 */
function closeOnEscapeKey(event) {
  if (event.code !== 'Escape') return;
  const nav = document.getElementById('nav');
  if (!nav) return;
  // close the search field if open
  const search = nav.querySelector('.nav-search.is-open');
  if (search) {
    // eslint-disable-next-line no-use-before-define
    toggleSearchBox(search, false);
    return;
  }
  // close the mobile menu if open (on desktop the CSS ignores this state)
  if (nav.getAttribute('aria-expanded') === 'true') {
    // eslint-disable-next-line no-use-before-define
    toggleMobileMenu(nav, false);
    nav.querySelector('.nav-hamburger-button').focus();
  }
}

/**
 * Toggles the entire nav (mobile menu)
 * @param {Element} nav The container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMobileMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger-button');
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  // the CSS styles the state classes; aria-expanded stays for assistive technology
  nav.classList.toggle('is-open', !expanded);
  document.body.classList.toggle('has-header-menu-open', !expanded);
  if (button) button.setAttribute('aria-label', expanded ? 'Abrir menú' : 'Cerrar menú');
}

/**
 * Toggles the expanding search field
 * @param {Element} search The .nav-search wrapper
 * @param {*} forceOpen Optional param to force open/close when not null
 */
function toggleSearchBox(search, forceOpen = null) {
  const isOpen = forceOpen !== null ? forceOpen : !search.classList.contains('is-open');
  search.classList.toggle('is-open', isOpen);
  const toggle = search.querySelector('.nav-search-toggle');
  const input = search.querySelector('.nav-search-input');
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  if (isOpen) {
    // wait for the expand transition before focusing so it reads naturally
    input.focus();
  } else {
    input.value = '';
  }
}

/**
 * Builds the search field (magnifier toggle + expanding input + clear button)
 * @returns {Element} the .nav-search wrapper
 */
function buildSearchBox() {
  const search = document.createElement('div');
  search.className = 'nav-search';
  search.innerHTML = `
    <form class="nav-search-field" role="search" action="/search">
      <span class="nav-search-icon nav-icon icon icon-search"></span>
      <input class="nav-search-input" type="search" name="q" placeholder="Buscar productos..." aria-label="Buscar productos" autocomplete="off">
      <button class="nav-search-clear" type="button" aria-label="Cerrar búsqueda">
        <span class="nav-icon icon icon-close"></span>
      </button>
    </form>
    <button class="nav-search-toggle" type="button" aria-label="Buscar" aria-expanded="false">
      <span class="nav-icon icon icon-search"></span>
    </button>`;

  const toggle = search.querySelector('.nav-search-toggle');
  const clear = search.querySelector('.nav-search-clear');
  const form = search.querySelector('.nav-search-field');

  toggle.addEventListener('click', () => toggleSearchBox(search));
  clear.addEventListener('click', () => {
    toggleSearchBox(search, false);
    toggle.focus();
  });
  form.addEventListener('submit', (event) => {
    const value = form.querySelector('.nav-search-input').value.trim();
    if (!value) event.preventDefault();
  });
  return search;
}

/**
 * Builds an icon tool link (user, cart) with optional badge
 * @param {Object} tool
 * @param {string} tool.href
 * @param {string} tool.label Accessible name (the link only shows an icon)
 * @param {string} tool.icon Icon name in /icons (user, cart)
 * @param {string} [tool.badge] Counter shown on the icon (e.g. cart items)
 * @returns {Element} a.nav-tool
 */
function buildHeaderToolLink({
  href, label, icon, badge,
}) {
  const link = document.createElement('a');
  link.className = `nav-tool nav-tool-${icon}`;
  link.href = href;
  link.setAttribute('aria-label', label);
  link.innerHTML = `<span class="nav-icon icon icon-${icon}"></span>`;
  if (badge) {
    const count = document.createElement('span');
    count.className = 'nav-tool-badge';
    count.textContent = badge;
    link.append(count);
  }
  return link;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM; every header style is scoped under .header-novamovil
  block.classList.add('header-novamovil');
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav-bar';
  if (fragment) {
    while (fragment.firstElementChild) nav.append(fragment.firstElementChild);
  }

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((name, index) => {
    const section = nav.children[index];
    if (section) section.classList.add(`nav-${name}`);
  });

  // brand: logo + wordmark as one link, ensure it points home
  const brandSource = nav.querySelector('.nav-brand');
  if (brandSource) brandSource.replaceChildren(buildBrandLink(brandSource, 'nav-brand'));

  // sections: primary navigation links, with class hooks (the CSS never styles tags)
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll('ul').forEach((ul) => ul.classList.add('nav-menu'));
    navSections.querySelectorAll('li').forEach((menuItem) => {
      menuItem.classList.add('nav-menu-item');
      // items may be plain text while the author has not linked them yet
      if (menuItem.querySelector('a')) menuItem.classList.add('has-link');
    });
    navSections.querySelectorAll('a').forEach((link) => link.classList.add('nav-menu-link'));
  }

  // read author-provided tool links (cuenta/carrito) from the tools section, else defaults
  const navTools = nav.querySelector('.nav-tools');
  const toolLinks = {};
  if (navTools) {
    navTools.querySelectorAll('a').forEach((link) => {
      const key = link.textContent.trim().toLowerCase();
      toolLinks[key] = link.getAttribute('href');
    });
    navTools.innerHTML = '';
  }
  const tools = navTools || document.createElement('div');
  tools.className = 'nav-tools';

  // build the interactive tools: search, user, cart
  tools.append(buildSearchBox());
  tools.append(buildHeaderToolLink({
    href: toolLinks.cuenta || TOOL_DEFAULTS.cuenta,
    label: 'Mi cuenta',
    icon: 'user',
  }));
  tools.append(buildHeaderToolLink({
    href: toolLinks.carrito || TOOL_DEFAULTS.carrito,
    label: 'Carrito',
    icon: 'cart',
    badge: '2',
  }));
  if (!navTools) nav.append(tools);

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button class="nav-hamburger-button" type="button" aria-controls="nav" aria-label="Abrir menú" aria-expanded="false">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMobileMenu(nav));
  tools.append(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  window.addEventListener('keydown', closeOnEscapeKey);

  // close the mobile menu when a section link is followed
  if (navSections) {
    navSections.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        toggleMobileMenu(nav, false);
      });
    });
  }

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
