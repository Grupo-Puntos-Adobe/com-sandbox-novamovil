/*
 * Optional authoring rows available in EVERY block (called once per block from
 * decorateMain in scripts.js, before the block's own JS runs):
 *
 *   | Styles    | padding-top: 0; padding-left: 20px |  -> inline styles on the block (main class)
 *   | Classname | dark compact                       |  -> extra classes on the block
 *
 * Both rows are optional and can be anywhere in the table (usually right after the
 * block name). They are removed from the block, so its own code never sees them.
 * Styles: declarations separated by ";" (a comma can be part of a CSS value, e.g.
 * rgba(0, 0, 0, .5) or a font list). Bare numbers get "px" (padding-left: 20 → 20px).
 * Classname: names separated by spaces or commas.
 */

const STYLE_KEYS = ['styles', 'style'];
const CLASS_KEYS = ['classname', 'classnames', 'class name', 'class names', 'class'];
const PROPERTY = /^-{0,2}[a-z][a-z0-9-]*$/i;
const CLASS_NAME = /^-?[_a-z][_a-z0-9-]*$/i;
// no external resources or script-like values from authored styles
const UNSAFE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|[<>{}]/i;
const BARE_NUMBER = /^-?\d*\.?\d+$/;

/**
 * Applies "property: value; property: value" to the element; invalid or unsafe
 * declarations are skipped.
 * @param {HTMLElement} element
 * @param {string} declarations
 */
export function applyAuthorStyles(element, declarations) {
  String(declarations || '')
    .split(/;|\n/)
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 1) return;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      let value = declaration.slice(separator + 1).trim();
      if (!PROPERTY.test(property) || !value || UNSAFE_VALUE.test(value)) return;
      const important = /!important$/i.test(value);
      value = value.replace(/\s*!important$/i, '');

      element.style.setProperty(property, value, important ? 'important' : '');
      // unitless numbers are invalid for lengths: retry as px (padding-left: 20 → 20px)
      if (!element.style.getPropertyValue(property) && BARE_NUMBER.test(value)) {
        element.style.setProperty(property, `${value}px`, important ? 'important' : '');
      }
    });
}

/**
 * Adds "name other-name" / "name, other-name" as classes on the element.
 * @param {HTMLElement} element
 * @param {string} names
 */
export function applyAuthorClasses(element, names) {
  String(names || '')
    .split(/[\s,]+/)
    .map((name) => name.trim())
    .filter((name) => CLASS_NAME.test(name))
    .forEach((name) => element.classList.add(name));
}

/**
 * Reads, applies and removes the optional Styles / Classname rows of a block.
 * @param {HTMLElement} block A decorated block (div.block)
 */
export default function applyBlockOptions(block) {
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    if (!keyCell || !valueCell || row.children.length !== 2) return;
    const key = keyCell.textContent.trim().toLowerCase();
    if (STYLE_KEYS.includes(key)) {
      applyAuthorStyles(block, valueCell.textContent);
      // authored margins add to the section spacing instead of collapsing into it
      if (block.getAttribute('style') && block.parentElement) {
        block.parentElement.style.display = 'flow-root';
      }
      row.remove();
    } else if (CLASS_KEYS.includes(key)) {
      applyAuthorClasses(block, valueCell.textContent);
      row.remove();
    }
  });
}
