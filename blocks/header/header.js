/*
 * NovaMóvil header (template block, rewritten). All styles are scoped under .header-novamovil.
 *
 * Entry point: decorate(block), called by loadHeader() (scripts/aem.js) from loadLazy()
 * in scripts/scripts.js, on every page.
 *
 * Content: the "nav" document (or the page's `nav` metadata), 3 sections:
 *   1. brand (logo + name)   2. menu links   3. tools (Mi cuenta / Carrito links)
 *
 * Flow:
 *   decorate(block)
 *     ├─ loadNavSections()              nav document → nav.nav-bar with its 3 sections
 *     ├─ 1. brand  → createBrandLink()  logo + name as one home link
 *     ├─ 2. menu   → decorateMenu()     class hooks on the menu list, items and links
 *     ├─ 3. tools  → readToolLinks()    authored Mi cuenta / Carrito (else DEFAULT_TOOL_LINKS)
 *     │              createSearchBox()   magnifier + expanding field  → setSearchOpen()
 *     │              createToolLink() ×2 Mi cuenta, Carrito (+ badge)
 *     │              createHamburger()   mobile menu button           → setMobileMenuOpen()
 *     └─ listeners: Escape → closeOnEscape(); menu link click → closes the mobile menu
 *
 * No resolution logic here: header.css decides what each resolution shows with the names of
 * styles/foundations/breakpoints.css (hamburger on mobile/tablet, horizontal menu on desktop,
 * page scroll locked while the mobile menu is open). JS only opens and closes things.
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

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

// brand used when the nav document has no logo image / no brand text
const DEFAULT_BRAND_NAME = 'NovaMóvil';
// part of the name painted in the accent colour when the author did not use italics
const BRAND_ACCENT_TEXT = 'Móvil';
// the 3 sections of the nav document, in order: each one gets the class nav-<name>
const NAV_SECTION_NAMES = ['brand', 'sections', 'tools'];
// tool links when the nav document does not have them (key = authored link text)
const DEFAULT_TOOL_LINKS = {
  cuenta: '/cuenta',
  carrito: '/carrito',
};
// items shown on the cart badge (fixed until there is a cart service)
const CART_ITEM_COUNT = '2';
const HAS_LETTERS = /\p{L}/u;

// ---------------------------------------------------------------------------------------------
// 1. Brand (logo + name as one home link). blocks/footer/footer.js has its own copy of this
//    logic: if you change how the brand is read, change the footer too.
// ---------------------------------------------------------------------------------------------

/**
 * The authored brand name as HTML, once the logo is removed: the WHOLE paragraph of the brand
 * link with its inner links unwrapped, so a name that Drive split in several links
 * (<a>Nova</a><em><a>Móvil</a></em>) stays whole: Nova<em>Móvil</em>. Without that paragraph:
 * the link, or the first paragraph with letters. '' when there is no text.
 * @param {Element} brandSection The brand section of the nav document
 * @param {Element|null} brandLink First link of the section
 * @returns {string}
 */
function readBrandNameHtml(brandSection, brandLink) {
  const linkParagraph = brandLink?.closest('p');
  const nameSource = [
    linkParagraph && brandSection.contains(linkParagraph) ? linkParagraph : null,
    brandLink,
    ...brandSection.querySelectorAll('p'),
  ].find((element) => element && HAS_LETTERS.test(element.textContent));
  if (!nameSource) {
    return '';
  }
  const name = nameSource.cloneNode(true);
  name.querySelectorAll('a').forEach((link) => link.replaceWith(...link.childNodes));
  return name.innerHTML.trim();
}

/**
 * The brand name span. Keeps the authored italics (<em>) as the accent; without italics, a
 * trailing "Móvil" gets the accent.
 * @param {string} nameHtml Authored name (readBrandNameHtml), or '' for DEFAULT_BRAND_NAME
 * @returns {Element} span.nav-brand-name (accent: em.nav-brand-accent)
 */
function createBrandName(nameHtml) {
  const name = document.createElement('span');
  name.className = 'nav-brand-name';
  name.innerHTML = nameHtml || DEFAULT_BRAND_NAME;
  const text = name.textContent.trim();
  if (!name.querySelector('em') && text.endsWith(BRAND_ACCENT_TEXT)) {
    const accent = document.createElement('em');
    accent.textContent = BRAND_ACCENT_TEXT;
    name.replaceChildren(text.slice(0, -BRAND_ACCENT_TEXT.length), accent);
  }
  name.querySelectorAll('em').forEach((accent) => accent.classList.add('nav-brand-accent'));
  return name;
}

/**
 * The brand as one home link:
 * - logo: the authored image; else the authored :logo: icon; else the default icon (painted by
 *   header.css from the colour tokens)
 * - name: the authored text; else DEFAULT_BRAND_NAME (no name when an image stands alone)
 * - href: the authored link; else /
 * @param {Element} brandSection The brand section of the nav document (its content is used)
 * @returns {Element} a.nav-brand-link
 */
function createBrandLink(brandSection) {
  const brandLink = brandSection.querySelector('a');
  const picture = brandSection.querySelector('picture');
  const icon = brandSection.querySelector('.icon');
  [picture, icon].forEach((element) => element?.remove());
  const nameHtml = readBrandNameHtml(brandSection, brandLink);

  const link = document.createElement('a');
  link.className = 'nav-brand-link';
  link.href = brandLink ? brandLink.getAttribute('href') : '/';

  if (picture) {
    picture.classList.add('nav-brand-logo');
    const image = picture.querySelector('img');
    if (image) {
      image.classList.add('nav-brand-image');
      if (!image.alt) {
        image.alt = nameHtml ? '' : DEFAULT_BRAND_NAME;
      }
    }
    link.append(picture);
  } else {
    const logo = icon || document.createElement('span');
    logo.className = 'icon icon-logo nav-brand-logo';
    logo.replaceChildren();
    link.append(logo);
  }

  if (nameHtml || !picture) {
    link.append(createBrandName(nameHtml));
  }
  return link;
}

// ---------------------------------------------------------------------------------------------
// 2. Menu
// ---------------------------------------------------------------------------------------------

/**
 * Class hooks on the menu (header.css never styles tags): nav-menu, nav-menu-item (+ has-link
 * when the item is linked; an item may still be plain text) and nav-menu-link.
 * @param {Element} menuSection The menu section of the nav document
 */
function decorateMenu(menuSection) {
  menuSection.querySelectorAll('ul').forEach((list) => list.classList.add('nav-menu'));
  menuSection.querySelectorAll('li').forEach((item) => {
    item.classList.add('nav-menu-item');
    if (item.querySelector('a')) {
      item.classList.add('has-link');
    }
  });
  menuSection.querySelectorAll('a').forEach((link) => link.classList.add('nav-menu-link'));
}

/**
 * Opens or closes the mobile menu (on desktop header.css ignores this state).
 * @param {Element} nav nav.nav-bar
 * @param {boolean} isOpen
 */
function setMobileMenuOpen(nav, isOpen) {
  nav.setAttribute('aria-expanded', String(isOpen));
  nav.classList.toggle('is-open', isOpen);
  document.body.classList.toggle('has-header-menu-open', isOpen);
  const button = nav.querySelector('.nav-hamburger-button');
  if (button) {
    button.setAttribute('aria-expanded', String(isOpen));
    button.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  }
}

/**
 * True while the mobile menu is open.
 * @param {Element} nav nav.nav-bar
 * @returns {boolean}
 */
function isMobileMenuOpen(nav) {
  return nav.getAttribute('aria-expanded') === 'true';
}

/**
 * The hamburger button that opens and closes the mobile menu.
 * @param {Element} nav nav.nav-bar
 * @returns {Element} div.nav-hamburger
 */
function createHamburger(nav) {
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button class="nav-hamburger-button" type="button" aria-controls="nav" aria-label="Abrir menú" aria-expanded="false">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => setMobileMenuOpen(nav, !isMobileMenuOpen(nav)));
  return hamburger;
}

// ---------------------------------------------------------------------------------------------
// 3. Tools: search, Mi cuenta, Carrito
// ---------------------------------------------------------------------------------------------

/**
 * Opens (and focuses) or closes (and empties) the search field.
 * @param {Element} search div.nav-search
 * @param {boolean} isOpen
 */
function setSearchOpen(search, isOpen) {
  search.classList.toggle('is-open', isOpen);
  search.querySelector('.nav-search-toggle').setAttribute('aria-expanded', String(isOpen));
  const input = search.querySelector('.nav-search-input');
  if (isOpen) {
    input.focus();
  } else {
    input.value = '';
  }
}

/**
 * The search: magnifier button + expanding field (/search?q=…) + close button. An empty search
 * is not sent.
 * @returns {Element} div.nav-search
 */
function createSearchBox() {
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

  const toggleButton = search.querySelector('.nav-search-toggle');
  const closeButton = search.querySelector('.nav-search-clear');
  const form = search.querySelector('.nav-search-field');

  toggleButton.addEventListener('click', () => {
    setSearchOpen(search, !search.classList.contains('is-open'));
  });
  closeButton.addEventListener('click', () => {
    setSearchOpen(search, false);
    toggleButton.focus();
  });
  form.addEventListener('submit', (event) => {
    if (!form.querySelector('.nav-search-input').value.trim()) {
      event.preventDefault();
    }
  });
  return search;
}

/**
 * The hrefs authored in the tools section, by link text in lower case
 * ({ cuenta: '/cuenta', carrito: '/carrito' }). The section is emptied: its links are rebuilt.
 * @param {Element|null} toolsSection The tools section of the nav document
 * @returns {Object<string, string>}
 */
function readToolLinks(toolsSection) {
  const toolLinks = {};
  if (!toolsSection) {
    return toolLinks;
  }
  toolsSection.querySelectorAll('a').forEach((link) => {
    toolLinks[link.textContent.trim().toLowerCase()] = link.getAttribute('href');
  });
  toolsSection.innerHTML = '';
  return toolLinks;
}

/**
 * An icon link of the tools (Mi cuenta, Carrito), with an optional counter.
 * @param {Object} tool
 * @param {string} tool.href
 * @param {string} tool.label Accessible name (the link only shows an icon)
 * @param {string} tool.icon Icon name in /icons (user, cart)
 * @param {string} [tool.badge] Counter shown on the icon (e.g. cart items)
 * @returns {Element} a.nav-tool
 */
function createToolLink({
  href, label, icon, badge,
}) {
  const link = document.createElement('a');
  link.className = `nav-tool nav-tool-${icon}`;
  link.href = href;
  link.setAttribute('aria-label', label);
  link.innerHTML = `<span class="nav-icon icon icon-${icon}"></span>`;
  if (badge) {
    const counter = document.createElement('span');
    counter.className = 'nav-tool-badge';
    counter.textContent = badge;
    link.append(counter);
  }
  return link;
}

// ---------------------------------------------------------------------------------------------
// Keyboard and loading
// ---------------------------------------------------------------------------------------------

/**
 * Escape closes the open search first; else the open mobile menu (focus back on the hamburger).
 * @param {KeyboardEvent} event
 */
function closeOnEscape(event) {
  const nav = document.getElementById('nav');
  if (event.code !== 'Escape' || !nav) {
    return;
  }
  const openSearch = nav.querySelector('.nav-search.is-open');
  if (openSearch) {
    setSearchOpen(openSearch, false);
    return;
  }
  if (isMobileMenuOpen(nav)) {
    setMobileMenuOpen(nav, false);
    nav.querySelector('.nav-hamburger-button').focus();
  }
}

/**
 * Loads the nav document (page metadata `nav`, else /nav) into nav#nav.nav-bar and marks its
 * sections: nav-brand, nav-sections, nav-tools (NAV_SECTION_NAMES).
 * @returns {Promise<Element>} nav.nav-bar
 */
async function loadNavSections() {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav-bar';
  while (fragment?.firstElementChild) {
    nav.append(fragment.firstElementChild);
  }
  NAV_SECTION_NAMES.forEach((name, index) => {
    nav.children[index]?.classList.add(`nav-${name}`);
  });
  return nav;
}

/**
 * Loads and decorates the header.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const nav = await loadNavSections();
  // every header style is scoped under .header-novamovil
  block.classList.add('header-novamovil');
  block.textContent = '';

  // 1. brand
  const brandSection = nav.querySelector('.nav-brand');
  if (brandSection) {
    brandSection.replaceChildren(createBrandLink(brandSection));
  }

  // 2. menu (following a link closes the mobile menu)
  const menuSection = nav.querySelector('.nav-sections');
  if (menuSection) {
    decorateMenu(menuSection);
    menuSection.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMobileMenuOpen(nav, false));
    });
  }

  // 3. tools: search, Mi cuenta, Carrito and the hamburger
  const authoredToolsSection = nav.querySelector('.nav-tools');
  const toolLinks = readToolLinks(authoredToolsSection);
  const toolsSection = authoredToolsSection || document.createElement('div');
  toolsSection.className = 'nav-tools';
  toolsSection.append(
    createSearchBox(),
    createToolLink({
      href: toolLinks.cuenta || DEFAULT_TOOL_LINKS.cuenta,
      label: 'Mi cuenta',
      icon: 'user',
    }),
    createToolLink({
      href: toolLinks.carrito || DEFAULT_TOOL_LINKS.carrito,
      label: 'Carrito',
      icon: 'cart',
      badge: CART_ITEM_COUNT,
    }),
  );
  if (!authoredToolsSection) {
    nav.append(toolsSection);
  }
  toolsSection.append(createHamburger(nav));
  nav.setAttribute('aria-expanded', 'false');

  window.addEventListener('keydown', closeOnEscape);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
