/*
 * NovaMóvil floating alerts (toasts), top-right, stackable.
 * Uses popover="manual" (top layer, no light dismiss) when supported and a fixed
 * element otherwise. Styles: styles/toast.css (.toast-novamovil), loaded on first use.
 *
 * showToast('No pudimos cargar las categorías', { duration: 5000, variant: 'error' });
 *
 * Called by: loadServiceList() in scripts/block-utils.js (error path of card-categories,
 * card-featured and card-promotions), with the options built by alertOptions().
 *
 * Flow:
 *   showToast(message, options)
 *     ├─ loadCSS(styles/toast.css)   scripts/aem.js, only on the first call
 *     ├─ builds div.toast-novamovil (text + close button), popover="manual" when supported
 *     ├─ restack()                   places it below the visible toasts
 *     └─ timer (paused on hover/focus) → removeToast() → restack()
 */
import { loadCSS } from './aem.js';

export const TOAST_VARIANTS = ['error', 'warning', 'success', 'info'];
const DEFAULT_DURATION = 5000;
const GAP = 12;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const supportsPopover = typeof HTMLElement !== 'undefined'
  && Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');

let cssLoaded;
const toasts = [];

/**
 * Stacks the visible toasts from the top: each one sits below the previous ones
 * (--toast-offset is read by styles/toast.css).
 */
function restack() {
  let offset = 0;
  toasts.forEach((toast) => {
    toast.style.setProperty('--toast-offset', `${offset}px`);
    offset += toast.offsetHeight + GAP;
  });
}

/**
 * Fades the toast out, removes it and restacks the rest. Safe to call twice
 * (timer + close button).
 * @param {HTMLElement} toast
 */
function removeToast(toast) {
  if (!toast.isConnected || toast.classList.contains('is-leaving')) return;
  clearTimeout(toast.timer);
  toast.classList.add('is-leaving');
  toast.classList.remove('is-visible');
  const done = () => {
    if (supportsPopover && toast.matches(':popover-open')) toast.hidePopover();
    toast.remove();
    toasts.splice(toasts.indexOf(toast), 1);
    restack();
  };
  toast.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 400); // in case transitions are disabled (reduced motion)
}

/**
 * Shows a floating alert.
 * @param {string} message Text to show (rendered as text, never HTML)
 * @param {Object} [options]
 * @param {number} [options.duration=5000] Milliseconds before hiding; 0 keeps it until closed
 * @param {string} [options.variant='error'] error | warning | success | info, or a hex
 *   colour (e.g. '#1a4fd8') for a custom background
 * @returns {Promise<HTMLElement>} the toast element
 */
export async function showToast(message, { duration = DEFAULT_DURATION, variant = 'error' } = {}) {
  cssLoaded = cssLoaded || loadCSS(`${window.hlx?.codeBasePath || ''}/styles/toast.css`);
  await cssLoaded;

  const toast = document.createElement('div');
  toast.className = 'toast-novamovil';
  if (HEX_COLOR.test(variant)) {
    toast.classList.add('toast-novamovil-custom');
    toast.style.setProperty('--toast-background', variant);
  } else {
    toast.classList.add(`toast-novamovil-${TOAST_VARIANTS.includes(variant) ? variant : 'error'}`);
  }
  const urgent = variant === 'error' || variant === 'warning';
  toast.setAttribute('role', urgent ? 'alert' : 'status');
  if (supportsPopover) toast.popover = 'manual';

  const text = document.createElement('p');
  text.className = 'toast-novamovil-message';
  text.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-novamovil-close';
  close.setAttribute('aria-label', 'Cerrar alerta');
  close.textContent = '×';
  close.addEventListener('click', () => removeToast(toast));

  toast.append(text, close);
  document.body.append(toast);
  if (supportsPopover) toast.showPopover();
  toasts.push(toast);
  restack();
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('is-visible')));

  // auto-hide, paused while the user hovers or focuses the alert
  const startTimer = () => {
    if (duration > 0) toast.timer = setTimeout(() => removeToast(toast), duration);
  };
  const stopTimer = () => clearTimeout(toast.timer);
  toast.addEventListener('pointerenter', stopTimer);
  toast.addEventListener('pointerleave', startTimer);
  toast.addEventListener('focusin', stopTimer);
  toast.addEventListener('focusout', startTimer);
  startTimer();

  return toast;
}
