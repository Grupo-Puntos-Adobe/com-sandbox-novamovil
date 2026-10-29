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
 *     ├─ loadFooterSections()                    footer document → its 3 sections
 *     ├─ 1. brand   → createBrandColumn()        brand link (createBrandLink) + tagline
 *     ├─ 2. links   → createLinkColumns()        one column per heading (createColumnTitle)
 *     └─ 3. bottom  → createBottomRow()          copyright + payment methods
 *     (readSectionItems() returns the authored elements of each section)
 *
 * Classes used by footer.css (no tag selectors): footer-inner, footer-grid, footer-brand(-link,
 * -logo, -image, -name, -accent), footer-tagline, footer-column, footer-column-title,
 * footer-links, footer-link, footer-column-text, footer-bottom, footer-copyright,
 * footer-payments, footer-payment, footer-inline-link (links inside tagline/copyright).
 *
 * Output: div.footer-novamovil > div.footer-inner > (div.footer-grid + div.footer-bottom)
 * Guide: blocks/footer/README.md
 */
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

// brand used when the footer document has no logo image / no brand text
const DEFAULT_BRAND_NAME = 'NovaMóvil';
// part of the name painted in the accent colour when the author did not use italics
const BRAND_ACCENT_TEXT = 'Móvil';
// accessible name of the payment methods list
const PAYMENTS_LABEL = 'Medios de pago';
const HAS_LETTERS = /\p{L}/u;
const HEADING_TAG = /^H[1-6]$/;
const LIST_TAGS = ['UL', 'OL'];

/**
 * True for a ul / ol.
 * @param {Element} element
 * @returns {boolean}
 */
const isList = (element) => LIST_TAGS.includes(element.tagName);

/**
 * Adds a class to every link inside an element.
 * @param {Element} element
 * @param {string} className
 */
function addLinkClass(element, className) {
  element.querySelectorAll('a').forEach((link) => link.classList.add(className));
}

// ---------------------------------------------------------------------------------------------
// 1. Brand (logo + name as one home link). blocks/header/header.js has the same functions:
//    if you change how the brand is read, change the header too.
// ---------------------------------------------------------------------------------------------

/**
 * The authored brand name as HTML, once the logo is removed: the WHOLE paragraph of the brand
 * link with its inner links unwrapped, so a name that Drive split in several links
 * (<a>Nova</a><em><a>Móvil</a></em>) stays whole: Nova<em>Móvil</em>. Without that paragraph:
 * the link, or the first paragraph with letters. '' when there is no text.
 * @param {Element} brandSection Element holding the authored logo and name
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
 * @returns {Element} span.footer-brand-name (accent: em.footer-brand-accent)
 */
function createBrandName(nameHtml) {
  const name = document.createElement('span');
  name.className = 'footer-brand-name';
  name.innerHTML = nameHtml || DEFAULT_BRAND_NAME;
  const text = name.textContent.trim();
  if (!name.querySelector('em') && text.endsWith(BRAND_ACCENT_TEXT)) {
    const accent = document.createElement('em');
    accent.textContent = BRAND_ACCENT_TEXT;
    name.replaceChildren(text.slice(0, -BRAND_ACCENT_TEXT.length), accent);
  }
  name.querySelectorAll('em').forEach((accent) => accent.classList.add('footer-brand-accent'));
  return name;
}

/**
 * The brand as one home link:
 * - logo: the authored image; else the authored :logo: icon; else the default icon (painted by
 *   footer.css from the colour tokens)
 * - name: the authored text; else DEFAULT_BRAND_NAME (no name when an image stands alone)
 * - href: the authored link; else /
 * @param {Element} brandSection Element holding the authored logo and name (its content is used)
 * @returns {Element} a.footer-brand-link
 */
function createBrandLink(brandSection) {
  const brandLink = brandSection.querySelector('a');
  const picture = brandSection.querySelector('picture');
  const icon = brandSection.querySelector('.icon');
  [picture, icon].forEach((element) => element?.remove());
  const nameHtml = readBrandNameHtml(brandSection, brandLink);

  const link = document.createElement('a');
  link.className = 'footer-brand-link';
  link.href = brandLink ? brandLink.getAttribute('href') : '/';

  if (picture) {
    picture.classList.add('footer-brand-logo');
    const image = picture.querySelector('img');
    if (image) {
      image.classList.add('footer-brand-image');
      if (!image.alt) {
        image.alt = nameHtml ? '' : DEFAULT_BRAND_NAME;
      }
    }
    link.append(picture);
  } else {
    const logo = icon || document.createElement('span');
    logo.className = 'icon icon-logo footer-brand-logo';
    logo.replaceChildren();
    link.append(logo);
  }

  if (nameHtml || !picture) {
    link.append(createBrandName(nameHtml));
  }
  return link;
}

/**
 * Section 1: the brand link, then the tagline. The brand is the first element, plus the next one
 * when the first is a lone image and the next one holds the link; the rest is the tagline.
 * @param {Element[]} items Authored elements of the brand section
 * @returns {Element} div.footer-brand
 */
function createBrandColumn(items) {
  const [first, second, ...taglineItems] = items;
  const brandSource = document.createElement('div');
  if (first) {
    brandSource.append(first);
  }
  const isLogoWithNameBelow = first && !HAS_LETTERS.test(first.textContent)
    && second?.querySelector('a');
  if (isLogoWithNameBelow) {
    brandSource.append(second);
  } else if (second) {
    taglineItems.unshift(second);
  }

  const column = document.createElement('div');
  column.className = 'footer-brand';
  column.append(createBrandLink(brandSource));
  taglineItems.forEach((element) => {
    element.classList.add('footer-tagline');
    addLinkClass(element, 'footer-inline-link');
    column.append(element);
  });
  return column;
}

// ---------------------------------------------------------------------------------------------
// 2. Link columns
// ---------------------------------------------------------------------------------------------

/**
 * A column title as an h2, whatever level the author used (### in Drive): the footer is its own
 * landmark, so the page heading order never skips a level (h1 → h3 on a page without h2).
 * @param {Element} heading Authored h1-h6
 * @returns {Element} h2 with the same id and content
 */
function createColumnTitle(heading) {
  if (heading.tagName === 'H2') {
    return heading;
  }
  const title = document.createElement('h2');
  if (heading.id) {
    title.id = heading.id;
  }
  title.append(...heading.childNodes);
  return title;
}

/**
 * Section 2: each heading starts a column with the content that follows it (content before the
 * first heading gets its own column). Lists → footer-links, other text → footer-column-text.
 * @param {Element[]} items Authored elements of the links section
 * @returns {Element[]} div.footer-column elements
 */
function createLinkColumns(items) {
  const columns = [];
  items.forEach((item) => {
    const isHeading = HEADING_TAG.test(item.tagName);
    if (isHeading || !columns.length) {
      const column = document.createElement('div');
      column.className = 'footer-column';
      columns.push(column);
    }
    const element = isHeading ? createColumnTitle(item) : item;
    if (isHeading) {
      element.classList.add('footer-column-title');
    } else if (isList(element)) {
      element.classList.add('footer-links');
    } else {
      element.classList.add('footer-column-text');
    }
    addLinkClass(element, 'footer-link');
    columns.at(-1).append(element);
  });
  return columns;
}

// ---------------------------------------------------------------------------------------------
// 3. Bottom row
// ---------------------------------------------------------------------------------------------

/**
 * Section 3: the copyright paragraph(s) and the payment methods list.
 * @param {Element[]} items Authored elements of the bottom section
 * @returns {Element} div.footer-bottom
 */
function createBottomRow(items) {
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';
  items.forEach((element) => {
    if (isList(element)) {
      element.classList.add('footer-payments');
      element.setAttribute('aria-label', PAYMENTS_LABEL);
      [...element.children].forEach((payment) => payment.classList.add('footer-payment'));
    } else {
      element.classList.add('footer-copyright');
      addLinkClass(element, 'footer-inline-link');
    }
    bottom.append(element);
  });
  return bottom;
}

// ---------------------------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------------------------

/**
 * The authored elements of a footer section (inside its content wrapper); [] without section.
 * @param {Element|undefined} section
 * @returns {Element[]}
 */
function readSectionItems(section) {
  if (!section) {
    return [];
  }
  const wrapper = section.querySelector('.default-content-wrapper') || section;
  return [...wrapper.children];
}

/**
 * Loads the footer document (page metadata `footer`, else /footer) and returns its sections.
 * [] when the document does not exist.
 * @returns {Promise<Element[]>} [brand, links, bottom]
 */
async function loadFooterSections() {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  return fragment ? [...fragment.children] : [];
}

/**
 * Loads and decorates the footer.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const [brandSection, linksSection, bottomSection] = await loadFooterSections();
  // every footer style is scoped under .footer-novamovil
  block.classList.add('footer-novamovil');
  block.textContent = '';
  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // 1. brand + 2. link columns, side by side
  const grid = document.createElement('div');
  grid.className = 'footer-grid';
  if (brandSection) {
    grid.append(createBrandColumn(readSectionItems(brandSection)));
  }
  grid.append(...createLinkColumns(readSectionItems(linksSection)));
  if (grid.children.length) {
    footer.append(grid);
  }

  // 3. bottom row
  const bottomItems = readSectionItems(bottomSection);
  if (bottomItems.length) {
    footer.append(createBottomRow(bottomItems));
  }

  block.append(footer);
}
