/*
 * NovaMóvil brand (logo + wordmark) as one home link, shared by the header and footer.
 *
 * Called by: blocks/header/header.js (prefix 'nav-brand') and
 * blocks/footer/footer.js (prefix 'footer-brand').
 *
 * Flow:
 *   buildBrand(source, prefix)      default export
 *     ├─ logo: authored <picture> → else authored :logo: icon → else default icon-logo span
 *     └─ buildBrandName(html, prefix) → wordmark, "Móvil" wrapped in <em> for the accent colour
 */

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
function buildBrandName(html, prefix) {
  const name = document.createElement('span');
  name.className = `${prefix}-name`;
  name.innerHTML = html || BRAND_NAME;
  if (!name.querySelector('em') && name.textContent.trim().endsWith(BRAND_ACCENT)) {
    const text = name.textContent.trim();
    const em = document.createElement('em');
    em.textContent = BRAND_ACCENT;
    name.replaceChildren(text.slice(0, -BRAND_ACCENT.length), em);
  }
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
export default function buildBrand(source, prefix) {
  const authoredLink = source.querySelector('a');
  const picture = source.querySelector('picture');
  const icon = source.querySelector('.icon');
  [picture, icon].forEach((el) => el?.remove());

  // authored wordmark: first link/paragraph that still has letters once the logo is removed
  const textSource = [authoredLink, ...source.querySelectorAll('p')]
    .find((el) => el && /\p{L}/u.test(el.textContent));
  const authoredName = textSource ? textSource.innerHTML.trim() : '';

  const link = document.createElement('a');
  link.className = `${prefix}-link`;
  link.href = authoredLink ? authoredLink.getAttribute('href') : '/';

  if (picture) {
    picture.classList.add(`${prefix}-logo`);
    const img = picture.querySelector('img');
    if (img && !img.alt) img.alt = authoredName ? '' : BRAND_NAME;
    link.append(picture);
  } else {
    const logo = icon || document.createElement('span');
    logo.className = `icon icon-logo ${prefix}-logo`;
    logo.replaceChildren();
    link.append(logo);
  }

  if (authoredName || !picture) link.append(buildBrandName(authoredName, prefix));
  return link;
}
