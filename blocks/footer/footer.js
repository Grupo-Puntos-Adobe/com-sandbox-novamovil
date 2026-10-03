/*
 * NovaMóvil footer (template block, rewritten). All styles are scoped under .footer-novamovil.
 *
 * Entry point: decorate(block), called by loadFooter() (scripts/aem.js) from loadLazy()
 * in scripts/scripts.js, on every page.
 *
 * Content: the "footer" document (or the page's `footer` metadata), 3 sections:
 *   1. brand + tagline   2. link columns (each heading starts a column)   3. copyright + payments
 * A missing footer document renders an empty footer instead of failing.
 *
 * Flow:
 *   decorate(block)
 *     ├─ loadFragment(footerPath)                blocks/fragment/fragment.js
 *     ├─ section 1 → buildFooterBrandColumn(items) → buildBrandLink()  (brand code in this file)
 *     ├─ section 2 → buildFooterLinkColumns(items)
 *     └─ section 3 → buildFooterBottom(items)
 *     (getSectionElements() extracts the authored elements of each section)
 *
 * Classes used by footer.css (no tag selectors): footer-inner, footer-grid, footer-brand(-link,
 * -logo, -image, -name, -accent), footer-tagline, footer-column, footer-column-title,
 * footer-links, footer-link, footer-column-text, footer-bottom, footer-copyright,
 * footer-payments, footer-payment, footer-inline-link (links inside tagline/copyright).
 *
 * Output: div.footer-novamovil > div.footer-inner > (div.footer-grid + div.footer-bottom)
 */
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/* --------------------------------------------------------------------------
 * Brand (logo + wordmark as one home link). The same code lives in
 * blocks/header/header.js: if you change the brand, change it in both blocks.
 * -------------------------------------------------------------------------- */

// brand used when the authored document has no logo image / no brand text
const BRAND_NAME = 'NovaMóvil';
const BRAND_ACCENT = 'Móvil';

/**
 * Builds the wordmark. Keeps the authored markup (incl. <em>); if the author
 * did not emphasise anything, the trailing "Móvil" gets the accent colour.
 * @param {string} html Authored wordmark markup, or empty for the default
 * @param {string} prefix Class prefix of the calling block (e.g. 'nav-brand')
 * @returns {Element} the `${prefix}-name` span
 */
function buildBrandWordmark(html, prefix) {
  const name = document.createElement('span');
  name.className = `${prefix}-name`;
  name.innerHTML = html || BRAND_NAME;
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
 * @param {Element} source Element holding the authored logo/wordmark (consumed)
 * @param {string} prefix Class prefix of the calling block (e.g. 'nav-brand')
 * @returns {Element} the `${prefix}-link` anchor
 */
function buildBrandLink(source, prefix) {
  const authoredLink = source.querySelector('a');
  const picture = source.querySelector('picture');
  const icon = source.querySelector('.icon');
  [picture, icon].forEach((element) => element?.remove());

  // authored wordmark: first link/paragraph that still has letters once the logo is removed
  const textSource = [authoredLink, ...source.querySelectorAll('p')]
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

// true when the element has any letter (tells a text brand from a lone logo image)
const hasLetterText = (element) => /\p{L}/u.test(element.textContent);

/**
 * Returns the authored elements of a fragment section (inside its content wrapper).
 * @param {Element} section A fragment section
 * @returns {Element[]}
 */
function getSectionElements(section) {
  if (!section) return [];
  const wrapper = section.querySelector('.default-content-wrapper') || section;
  return [...wrapper.children];
}

/**
 * Section 1: brand link (logo + wordmark) followed by the tagline.
 * The brand is the first element (plus the next one when the first is a lone image).
 * @param {Element[]} items Authored elements
 * @returns {Element} the .footer-brand column
 */
function buildFooterBrandColumn(items) {
  const column = document.createElement('div');
  column.className = 'footer-brand';

  const source = document.createElement('div');
  const [first, second, ...rest] = items;
  const tagline = rest;
  if (first) source.append(first);
  if (first && !hasLetterText(first) && second?.querySelector('a')) source.append(second);
  else if (second) tagline.unshift(second);

  column.append(buildBrandLink(source, 'footer-brand'));
  tagline.forEach((element) => {
    element.classList.add('footer-tagline');
    element.querySelectorAll('a').forEach((link) => link.classList.add('footer-inline-link'));
    column.append(element);
  });
  return column;
}

/**
 * Section 2: each heading starts a column holding the content that follows it.
 * @param {Element[]} items Authored elements
 * @returns {Element[]} the .footer-column elements
 */
function buildFooterLinkColumns(items) {
  const columns = [];
  items.forEach((element) => {
    const isHeading = /^H[1-6]$/.test(element.tagName);
    if (isHeading || !columns.length) {
      const column = document.createElement('div');
      column.className = 'footer-column';
      columns.push(column);
    }
    // class hooks so footer.css never styles tags
    if (isHeading) element.classList.add('footer-column-title');
    else if (element.tagName === 'UL' || element.tagName === 'OL') element.classList.add('footer-links');
    else element.classList.add('footer-column-text');
    element.querySelectorAll('a').forEach((link) => link.classList.add('footer-link'));
    columns.at(-1).append(element);
  });
  return columns;
}

/**
 * Section 3: copyright paragraph(s) and the payment methods list.
 * @param {Element[]} items Authored elements
 * @returns {Element} the .footer-bottom row
 */
function buildFooterBottom(items) {
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';
  items.forEach((element) => {
    if (element.tagName === 'UL' || element.tagName === 'OL') {
      element.classList.add('footer-payments');
      element.setAttribute('aria-label', 'Medios de pago');
      [...element.children].forEach((paymentItem) => paymentItem.classList.add('footer-payment'));
    } else {
      element.classList.add('footer-copyright');
      element.querySelectorAll('a').forEach((link) => link.classList.add('footer-inline-link'));
    }
    bottom.append(element);
  });
  return bottom;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM (the footer document may not exist yet);
  // every footer style is scoped under .footer-novamovil
  block.classList.add('footer-novamovil');
  block.textContent = '';
  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  const sections = fragment ? [...fragment.children] : [];
  const [brandSection, linksSection, bottomSection] = sections;

  const grid = document.createElement('div');
  grid.className = 'footer-grid';
  if (brandSection) grid.append(buildFooterBrandColumn(getSectionElements(brandSection)));
  grid.append(...buildFooterLinkColumns(getSectionElements(linksSection)));
  if (grid.children.length) footer.append(grid);

  const bottomItems = getSectionElements(bottomSection);
  if (bottomItems.length) footer.append(buildFooterBottom(bottomItems));

  block.append(footer);
}
