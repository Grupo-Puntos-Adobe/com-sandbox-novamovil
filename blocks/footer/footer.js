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
 *     ├─ section 1 → buildBrandColumn(items)     → buildBrand() scripts/brand.js
 *     ├─ section 2 → buildLinkColumns(items)
 *     └─ section 3 → buildBottom(items)
 *     (sectionContent() extracts the authored elements of each section)
 *
 * Output: div.footer-novamovil > div.footer-inner > (div.footer-grid + div.footer-bottom)
 */
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import buildBrand from '../../scripts/brand.js';

// true when the element has any letter (tells a text brand from a lone logo image)
const hasLetters = (el) => /\p{L}/u.test(el.textContent);

/**
 * Returns the authored elements of a fragment section (inside its content wrapper).
 * @param {Element} section A fragment section
 * @returns {Element[]}
 */
function sectionContent(section) {
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
function buildBrandColumn(items) {
  const column = document.createElement('div');
  column.className = 'footer-brand';

  const source = document.createElement('div');
  const [first, second, ...rest] = items;
  const tagline = rest;
  if (first) source.append(first);
  if (first && !hasLetters(first) && second?.querySelector('a')) source.append(second);
  else if (second) tagline.unshift(second);

  column.append(buildBrand(source, 'footer-brand'));
  tagline.forEach((el) => {
    el.classList.add('footer-tagline');
    column.append(el);
  });
  return column;
}

/**
 * Section 2: each heading starts a column holding the content that follows it.
 * @param {Element[]} items Authored elements
 * @returns {Element[]} the .footer-column elements
 */
function buildLinkColumns(items) {
  const columns = [];
  items.forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName) || !columns.length) {
      const column = document.createElement('div');
      column.className = 'footer-column';
      columns.push(column);
    }
    columns.at(-1).append(el);
  });
  return columns;
}

/**
 * Section 3: copyright paragraph(s) and the payment methods list.
 * @param {Element[]} items Authored elements
 * @returns {Element} the .footer-bottom row
 */
function buildBottom(items) {
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';
  items.forEach((el) => {
    if (el.tagName === 'UL' || el.tagName === 'OL') {
      el.classList.add('footer-payments');
      el.setAttribute('aria-label', 'Medios de pago');
    } else {
      el.classList.add('footer-copyright');
    }
    bottom.append(el);
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
  if (brandSection) grid.append(buildBrandColumn(sectionContent(brandSection)));
  grid.append(...buildLinkColumns(sectionContent(linksSection)));
  if (grid.children.length) footer.append(grid);

  const bottomItems = sectionContent(bottomSection);
  if (bottomItems.length) footer.append(buildBottom(bottomItems));

  block.append(footer);
}
