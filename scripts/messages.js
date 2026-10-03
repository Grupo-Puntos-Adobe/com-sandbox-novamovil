/*
 * Generic messages and formats shared by every NovaMóvil block.
 *
 * Only messages have defaults here: the floating alert, what a service answer leaves on
 * screen and the photo that fails. A block uses them only when its table in Drive does
 * not have the row (an empty row means "no text", see readRowTextOrDefault in block-utils.js;
 * Error Response Message uses the default also when empty):
 *   | Error Response Message | …  → errorResponseMessage
 *   | Empty List Title       | …  → emptyListTitle
 *   | Empty List Description | …  → emptyListDescription
 *   | Image Error Message    | …  → imageErrorMessage
 * Texts that are content (Title, Link, Button Text…) have no default: they come from the
 * table or are not painted. Block-specific texts ("No pudimos cargar las categorías…") go
 * in the table, not here. The icon of the empty list is not here: each block has its own
 * default (Empty List Icon).
 */
const MESSAGES = {
  // floating alert when a service fails or does not answer
  errorResponseMessage: 'No pudimos cargar la información. Intenta de nuevo más tarde.',
  // "nothing to show" message (empty list or service error)
  emptyListTitle: 'Por ahora no hay elementos disponibles',
  emptyListDescription: 'Vuelve pronto para descubrir nuestras novedades.',
  // shown in place of a photo that is missing or fails to load
  imageErrorMessage: 'Imagen no disponible',
};

// language of numbers and prices (Intl.NumberFormat)
export const LOCALE = 'es-MX';

// ISO 4217 currency used when a price from a service has none (or an invalid code)
export const CURRENCY = 'MXN';

export default MESSAGES;
