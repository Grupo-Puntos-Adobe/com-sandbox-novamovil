import applyBlockOptions from '../../scripts/block-options.js';

const HEADING = 'h1, h2, h3, h4, h5, h6';

/**
 * A paragraph that only holds one link (buttonised by decorateButtons in scripts.js).
 * @param {Element} el
 * @returns {boolean}
 */
function isButtonParagraph(el) {
  if (el.tagName !== 'P') return false;
  if (el.classList.contains('button-wrapper')) return true;
  const link = el.querySelector('a');
  return !!link && el.textContent.trim() === link.textContent.trim();
}

/**
 * Turns "<strong>4.9M+</strong> Usuarios activos" into value + label.
 * @param {Element} li A stats list item
 */
function decorateStat(li) {
  const strong = li.querySelector('strong');
  const text = li.textContent.trim();
  const valueText = strong ? strong.textContent.trim() : text.split(/\s+/)[0];
  const labelText = text.slice(text.indexOf(valueText) + valueText.length).trim();

  const value = document.createElement('span');
  value.className = 'hero-stat-value';
  value.textContent = valueText;
  const label = document.createElement('span');
  label.className = 'hero-stat-label';
  label.textContent = labelText;

  li.className = 'hero-stat';
  li.replaceChildren(value, label);
}

/**
 * Builds the text column: eyebrow, title (with highlighted <em>), description,
 * actions and stats, keeping the authored order.
 * @param {Element[]} items Authored elements of the content cell
 * @returns {Element} the .hero-content column
 */
function buildContent(items) {
  const content = document.createElement('div');
  content.className = 'hero-content';
  const headingIndex = items.findIndex((el) => el.matches(HEADING));
  let actions;

  items.forEach((el, i) => {
    if (el.matches(HEADING)) {
      el.classList.add('hero-title');
      el.querySelectorAll('em').forEach((em) => em.classList.add('hero-highlight'));
      content.append(el);
    } else if (el.matches('ul, ol')) {
      el.classList.add('hero-stats');
      [...el.children].forEach(decorateStat);
      content.append(el);
    } else if (isButtonParagraph(el)) {
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'hero-actions';
        content.append(actions);
      }
      actions.append(el);
    } else if (i < headingIndex) {
      el.classList.add('hero-eyebrow');
      content.append(el);
    } else {
      el.classList.add('hero-description');
      content.append(el);
    }
  });
  return content;
}

/**
 * Hero Novamovil: text column + product image. The block name gives the main
 * .hero-novamovil class that scopes every style.
 * Cells are found by content (picture vs text), so their order does not matter.
 * @param {Element} block The hero-novamovil block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the cells
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const mediaCell = cells.find((c) => c.querySelector('picture') && !c.querySelector(HEADING));
  const contentCell = cells.find((c) => c !== mediaCell && c.textContent.trim());

  // a picture authored inside the text cell is moved to the media column
  const picture = mediaCell?.querySelector('picture') || contentCell?.querySelector('picture');
  const pictureParagraph = picture?.closest('p');
  if (pictureParagraph && contentCell?.contains(pictureParagraph)) pictureParagraph.remove();

  const inner = document.createElement('div');
  inner.className = 'hero-inner';
  if (contentCell) inner.append(buildContent([...contentCell.children]));

  if (picture) {
    const media = document.createElement('div');
    media.className = 'hero-media';
    const img = picture.querySelector('img');
    if (img) {
      // largest element above the fold on desktop
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
    media.append(picture);
    inner.append(media);
  } else {
    block.classList.add('no-media');
  }

  block.replaceChildren(inner);
}
