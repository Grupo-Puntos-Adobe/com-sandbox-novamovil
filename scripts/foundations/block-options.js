/*
 * Optional authoring rows for the NovaMóvil blocks (hero-novamovil, card-*). Opt-in:
 * a block calls applyBlockOptions(block) as the FIRST line of its decorate(); template
 * blocks (cards, columns, hero…) do not call it and are left untouched.
 *
 *   | Styles    | padding-top: 0; padding-left: 20px |  -> inline styles on the block (main class)
 *   | Classname | dark compact                       |  -> extra classes on the block
 *
 * Both rows are optional and can be anywhere in the table (usually right after the
 * block name). They are removed from the block, so the rest of its code never sees them.
 * Styles: declarations separated by ";" (a comma can be part of a CSS value, e.g.
 * rgba(0, 0, 0, .5) or a font list). Bare numbers get "px" (padding-left: 20 → 20px).
 * Classname: names separated by spaces or commas.
 *
 * Separators accepted:
 *   ┌─────────────┬──────────────────────────────────────────────┐
 *   │ Styles      │ ";"   "\n"                                   │
 *   │ Classname   │ espacio   tab   "\n"   ","   ";"             │
 *   └─────────────┴──────────────────────────────────────────────┘
 *   (Styles NO acepta "," porque rompería valores como rgba(0,0,0,.5) o Arial, sans-serif)
 *   (Styles NO acepta espacios ni tabs porque son parte de la sintaxis CSS:
 *    padding: 0 20px, margin: 10px auto, font: italic bold 12px Arial…)
 *   (Classname acepta ";" de forma defensiva: si el autor lo escribe por error, no rompe)
 *
 * Called by: hero-novamovil, card-categories, card-featured, card-promotions (first line
 * of decorate). New NovaMóvil blocks must do the same.
 *
 * Flow:
 *   applyBlockOptions(block)            default export, one call per block
 *     ├─ "Styles" row    → applyAuthorStyles(block, text)  + display:flow-root on the wrapper
 *     └─ "Classname" row → applyAuthorClasses(block, text)
 *     (both rows are then removed)
 *
 * Guide: documentation/01-styles-classname.md
 */

const STYLE_KEYS = ['styles', 'style'];
const CLASS_KEYS = [
  'classname',
  'classnames',
  'class name',
  'class names',
  'class',
];
const PROPERTY = /^-{0,2}[a-z][a-z0-9-]*$/i;
const CLASS_NAME = /^-?[_a-z][_a-z0-9-]*$/i;
// no external resources or script-like values from authored styles
const UNSAFE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|[<>{}]/i;
const BARE_NUMBER = /^-?\d*\.?\d+$/;

// Separadores de authoring
// STYLE_SEPARATOR: ";" y "\n". NO acepta "," (rompería rgba(0,0,0,.5), Arial, sans-serif)
// ni espacios/tabs (son parte de la sintaxis CSS: padding: 0 20px).
const STYLE_SEPARATOR = /[;\n]/;
// CLASS_SEPARATOR: espacio, tab, "\n", "," y ";" (este último defensivo).
const CLASS_SEPARATOR = /[\s,;]+/;

/**
 * Applies "property: value; property: value" to the block; invalid or unsafe
 * declarations are skipped.
 * @param {Element} block
 * @param {string} declarations
 */
export function applyAuthorStyles(block, declarations) {
  String(declarations || '')
    .split(STYLE_SEPARATOR) // ✅ VALIDOS: ";"  "\n"
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 1) {
        return;
      }
      const property = declaration.slice(0, separator).trim().toLowerCase();
      let value = declaration.slice(separator + 1).trim();
      if (!PROPERTY.test(property) || !value || UNSAFE_VALUE.test(value)) {
        return;
      }
      const important = /!important$/i.test(value);
      value = value.replace(/\s*!important$/i, '');

      block.style.setProperty(property, value, important ? 'important' : '');
      // unitless numbers are invalid for lengths: retry as px (padding-left: 20 → 20px)
      if (
        !block.style.getPropertyValue(property)
        && BARE_NUMBER.test(value)
      ) {
        block.style.setProperty(
          property,
          `${value}px`,
          important ? 'important' : '',
        );
      }
    });
}

/**
 * Adds "name other-name" / "name, other-name" as classes on the block.
 * @param {Element} block
 * @param {string} names
 */
export function applyAuthorClasses(block, names) {
  String(names || '')
    .split(CLASS_SEPARATOR) // ✅ VALIDOS: espacio  tab  "\n"  ","  ";"
    .map((name) => name.trim())
    .filter((name) => CLASS_NAME.test(name))
    .forEach((name) => block.classList.add(name));
}

/**
 * Reads, applies and removes the optional Styles / Classname rows of a block.
 * @param {Element} block A decorated block (div.block)
 */
export default function applyBlockOptions(block) {
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const [keyCell, valueCell, ...extraCells] = row.children;
    // name | value; extra cells are allowed only if empty (tables with 3+ columns)
    if (!keyCell || !valueCell || extraCells.some((cell) => cell.textContent.trim())) {
      return;
    }
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
