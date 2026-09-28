import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

// tool links (author can override the labels/urls in the nav document tools section)
const TOOL_DEFAULTS = {
  cuenta: '/cuenta',
  carrito: '/carrito',
};

// brand wordmark used when the nav document has no brand text (e.g. only an emoji)
const BRAND_DEFAULT = 'Nova<em>Móvil</em>';

function closeOnEscape(e) {
  if (e.code !== 'Escape') return;
  const nav = document.getElementById('nav');
  if (!nav) return;
  // close the search field if open
  const search = nav.querySelector('.nav-search.is-open');
  if (search) {
    // eslint-disable-next-line no-use-before-define
    toggleSearch(search, false);
    return;
  }
  // close the mobile menu if open
  if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
    // eslint-disable-next-line no-use-before-define
    toggleMenu(nav, false);
    nav.querySelector('.nav-hamburger button').focus();
  }
}

/**
 * Toggles the entire nav (mobile menu)
 * @param {Element} nav The container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) button.setAttribute('aria-label', expanded ? 'Abrir menú' : 'Cerrar menú');
}

/**
 * Toggles the expanding search field
 * @param {Element} search The .nav-search wrapper
 * @param {*} forceOpen Optional param to force open/close when not null
 */
function toggleSearch(search, forceOpen = null) {
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
function buildSearch() {
  const search = document.createElement('div');
  search.className = 'nav-search';
  search.innerHTML = `
    <form class="nav-search-field" role="search" action="/search">
      <span class="nav-search-icon icon icon-search"></span>
      <input class="nav-search-input" type="search" name="q" placeholder="Buscar productos..." aria-label="Buscar productos" autocomplete="off">
      <button class="nav-search-clear" type="button" aria-label="Cerrar búsqueda">
        <span class="icon icon-close"></span>
      </button>
    </form>
    <button class="nav-search-toggle" type="button" aria-label="Buscar" aria-expanded="false">
      <span class="icon icon-search"></span>
    </button>`;

  const toggle = search.querySelector('.nav-search-toggle');
  const clear = search.querySelector('.nav-search-clear');
  const form = search.querySelector('.nav-search-field');

  toggle.addEventListener('click', () => toggleSearch(search));
  clear.addEventListener('click', () => {
    toggleSearch(search, false);
    toggle.focus();
  });
  form.addEventListener('submit', (e) => {
    const value = form.querySelector('.nav-search-input').value.trim();
    if (!value) e.preventDefault();
  });
  return search;
}

/**
 * Rebuilds the brand as a single home link: logo icon + wordmark.
 * Falls back to the default logo/wordmark when the author omits them.
 * @param {Element} navBrand The .nav-brand section
 */
function buildBrand(navBrand) {
  const authoredLink = navBrand.querySelector('a');
  const logo = navBrand.querySelector('.icon, picture');
  if (logo) logo.remove();

  const link = document.createElement('a');
  link.className = 'nav-brand-link';
  link.href = authoredLink ? authoredLink.getAttribute('href') : '/';

  const icon = logo || document.createElement('span');
  if (!logo) icon.className = 'icon icon-logo';
  link.append(icon);

  // keep the authored wordmark (incl. <em>) only if it contains letters
  const source = authoredLink || navBrand.querySelector('p') || navBrand;
  const name = document.createElement('span');
  name.className = 'nav-brand-name';
  name.innerHTML = /\p{L}/u.test(source.textContent) ? source.innerHTML.trim() : BRAND_DEFAULT;
  link.append(name);

  navBrand.replaceChildren(link);
  decorateIcons(navBrand);
}

/**
 * Builds an icon tool link (user, cart) with optional badge
 */
function buildToolLink({
  href, label, icon, badge,
}) {
  const link = document.createElement('a');
  link.className = `nav-tool nav-tool-${icon}`;
  link.href = href;
  link.setAttribute('aria-label', label);
  link.innerHTML = `<span class="icon icon-${icon}"></span>`;
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

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  if (fragment) {
    while (fragment.firstElementChild) nav.append(fragment.firstElementChild);
  }

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // brand: logo + wordmark as one link, ensure it points home
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) buildBrand(navBrand);

  // sections: primary navigation links
  const navSections = nav.querySelector('.nav-sections');

  // read author-provided tool links (cuenta/carrito) from the tools section, else defaults
  const navTools = nav.querySelector('.nav-tools');
  const toolLinks = {};
  if (navTools) {
    navTools.querySelectorAll('a').forEach((a) => {
      const key = a.textContent.trim().toLowerCase();
      toolLinks[key] = a.getAttribute('href');
    });
    navTools.innerHTML = '';
  }
  const tools = navTools || document.createElement('div');
  tools.className = 'nav-tools';

  // build the interactive tools: search, user, cart
  tools.append(buildSearch());
  tools.append(buildToolLink({
    href: toolLinks.cuenta || TOOL_DEFAULTS.cuenta,
    label: 'Mi cuenta',
    icon: 'user',
  }));
  tools.append(buildToolLink({
    href: toolLinks.carrito || TOOL_DEFAULTS.carrito,
    label: 'Carrito',
    icon: 'cart',
    badge: '2',
  }));
  if (!navTools) nav.append(tools);

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Abrir menú" aria-expanded="false">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));
  tools.append(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // reset the mobile menu state when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => toggleMenu(nav, isDesktop.matches));
  window.addEventListener('keydown', closeOnEscape);

  // close the mobile menu when a section link is followed
  if (navSections) {
    navSections.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        if (!isDesktop.matches) toggleMenu(nav, true);
      });
    });
  }

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
