/*
 * Hero Novamovil block: eyebrow, title, description, buttons, stats + image.
 *
 * Entry point: decorate(block), called by loadBlock() (scripts/aem.js) for every
 * "Hero Novamovil" table. It is the first section, so it is loaded eagerly (LCP).
 *
 * Authoring: one row per element, every row optional and in any order:
 *   | Styles / Classname | …                          (scripts/block-options.js)
 *   | Eyebrow            | Lanzamiento exclusivo 2026 |
 *   | Title              | El futuro de la *conectividad* está aquí |   (italic = highlight)
 *   | Description        | Los mejores smartphones…   |
 *   | Button 1           | [Ver celulares](/celulares) |   (Button 1 = primary)
 *   | Button 2           | [Ver planes](/planes)      |   (Button 2, 3… = secondary)
 *   | Stat 1             | 4.9M+ | Usuarios activos   |   (value | label)
 *   | Image              | picture                    |
 * The page always shows them in the design order, whatever the order of the rows.
 *
 * Flow:
 *   decorate(block)
 *     ├─ applyBlockOptions(block)   scripts/block-options.js → Styles / Classname rows
 *     ├─ readRows(block)            { 'eyebrow': [cells], 'button 1': [cells], … }
 *     ├─ buildText()                eyebrow, description · buildTitle() (role=heading, level 1)
 *     ├─ buildButtons()             numbered "Button N" rows → a.hero-button
 *     ├─ buildStats()               numbered "Stat N" rows → div.hero-stat (role=listitem)
 *     └─ buildMedia()               picture with loading=eager + fetchpriority=high
 *
 * Everything is a <div> except the buttons (<a>, they are links) and the image
 * (<picture>/<img>, optimised by AEM). Classes used by hero-novamovil.css: hero-inner,
 * hero-content, hero-eyebrow, hero-title, hero-highlight, hero-description, hero-actions,
 * hero-button(-primary|-secondary), hero-stats, hero-stat(-value|-label), hero-media,
 * hero-picture, hero-image.
 *
 * Output: div.hero-novamovil > div.hero-inner > (div.hero-content + div.hero-media)
 */
import applyBlockOptions from '../../scripts/block-options.js';

/**
 * Reads the authored rows by their name (first cell, case-insensitive).
 * @param {Element} block
 * @returns {Object<string, Element[]>} row name → value cells
 */
function readRows(block) {
  const rows = {};
  [...block.children].forEach((row) => {
    const [keyCell, ...cells] = row.children;
    const key = keyCell?.textContent.trim().toLowerCase().replace(/\s+/g, ' ');
    if (key) rows[key] = cells;
  });
  return rows;
}

/**
 * Rows named "<name> <number>" (Button 1, Stat 2…), sorted by their number.
 * @param {Object<string, Element[]>} rows
 * @param {string} name 'button' | 'stat'
 * @returns {Element[][]} value cells of each row
 */
function numberedRows(rows, name) {
  const pattern = new RegExp(`^${name} ?(\\d+)$`);
  return Object.keys(rows)
    .map((key) => ({ key, number: Number(key.match(pattern)?.[1]) }))
    .filter(({ number }) => Number.isFinite(number))
    .sort((a, b) => a.number - b.number)
    .map(({ key }) => rows[key]);
}

/**
 * Moves the authored content of a cell into a new div, without paragraph tags:
 * one paragraph is unwrapped, several become one div each.
 * @param {Element} cell Authored cell
 * @param {string} className
 * @returns {Element|null} null when the cell is empty
 */
function buildText(cell, className) {
  if (!cell || !cell.textContent.trim()) return null;
  const div = document.createElement('div');
  div.className = className;
  const paragraphs = [...cell.children].filter((el) => el.tagName === 'P');
  if (paragraphs.length > 1) {
    paragraphs.forEach((p) => {
      const line = document.createElement('div');
      line.append(...p.childNodes);
      div.append(line);
    });
  } else {
    div.append(...(paragraphs[0] || cell).childNodes);
  }
  return div;
}

/**
 * Title: a div announced as the page's main heading; the italic word becomes the
 * gradient highlight.
 * @param {Element} cell Authored Title cell
 * @returns {Element|null}
 */
function buildTitle(cell) {
  const title = buildText(cell, 'hero-title');
  if (!title) return null;
  title.setAttribute('role', 'heading');
  title.setAttribute('aria-level', '1');
  title.querySelectorAll('em, i').forEach((em) => {
    const highlight = document.createElement('span');
    highlight.className = 'hero-highlight';
    highlight.append(...em.childNodes);
    em.replaceWith(highlight);
  });
  return title;
}

/**
 * "Button N" rows → links: Button 1 is the primary (gradient), the rest secondary.
 * Authored bold/italic and the global .button classes are not used.
 * @param {Element[][]} buttonRows Value cells of each Button row, in order
 * @returns {Element|null} div.hero-actions
 */
function buildButtons(buttonRows) {
  const links = buttonRows.map(([cell]) => cell?.querySelector('a')).filter(Boolean);
  if (!links.length) return null;
  const actions = document.createElement('div');
  actions.className = 'hero-actions';
  links.forEach((authored, i) => {
    const link = document.createElement('a');
    link.className = `hero-button ${i === 0 ? 'hero-button-primary' : 'hero-button-secondary'}`;
    link.href = authored.getAttribute('href');
    if (authored.title) link.title = authored.title;
    link.textContent = authored.textContent.trim();
    actions.append(link);
  });
  return actions;
}

/**
 * "Stat N" rows (value | label) → a list of stats built with divs.
 * @param {Element[][]} statRows Value cells of each Stat row, in order
 * @returns {Element|null} div.hero-stats
 */
function buildStats(statRows) {
  const items = statRows.filter(([value]) => value?.textContent.trim());
  if (!items.length) return null;
  const stats = document.createElement('div');
  stats.className = 'hero-stats';
  stats.setAttribute('role', 'list');
  items.forEach(([valueCell, labelCell]) => {
    const stat = document.createElement('div');
    stat.className = 'hero-stat';
    stat.setAttribute('role', 'listitem');
    const value = document.createElement('div');
    value.className = 'hero-stat-value';
    value.textContent = valueCell.textContent.trim();
    stat.append(value);
    if (labelCell?.textContent.trim()) {
      const label = document.createElement('div');
      label.className = 'hero-stat-label';
      label.textContent = labelCell.textContent.trim();
      stat.append(label);
    }
    stats.append(stat);
  });
  return stats;
}

/**
 * Image row → div.hero-media (hidden on mobile/tablet by the CSS).
 * @param {Element[]} [imageCells]
 * @returns {Element|null}
 */
function buildMedia(imageCells) {
  const picture = imageCells?.map((cell) => cell.querySelector('picture')).find(Boolean);
  if (!picture) return null;
  picture.classList.add('hero-picture');
  const img = picture.querySelector('img');
  if (img) {
    img.classList.add('hero-image');
    // largest element above the fold on desktop
    img.loading = 'eager';
    img.fetchPriority = 'high';
  }
  const media = document.createElement('div');
  media.className = 'hero-media';
  media.append(picture);
  return media;
}

/**
 * Hero Novamovil. The block name gives the main .hero-novamovil class that scopes
 * every style.
 * @param {Element} block The hero-novamovil block element
 */
export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the rows
  const rows = readRows(block);

  const content = document.createElement('div');
  content.className = 'hero-content';
  content.append(...[
    buildText(rows.eyebrow?.[0], 'hero-eyebrow'),
    buildTitle(rows.title?.[0]),
    buildText(rows.description?.[0], 'hero-description'),
    buildButtons(numberedRows(rows, 'button')),
    buildStats(numberedRows(rows, 'stat')),
  ].filter(Boolean));

  const inner = document.createElement('div');
  inner.className = 'hero-inner';
  inner.append(content);
  const media = buildMedia(rows.image);
  if (media) inner.append(media);
  else block.classList.add('no-media');

  block.replaceChildren(inner);
}
