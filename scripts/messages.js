/*
 * Generic messages shared by every NovaMóvil block.
 *
 * A block uses them only when its table in Drive does not bring its own text:
 *   | Error Response Message | …  → errorResponseMessage
 *   | Empty List Title       | …  → emptyListTitle
 *   | Empty List Description | …  → emptyListDescription
 * Block-specific texts (e.g. "No pudimos cargar las categorías…") go in the table, not here.
 * The icon of the empty list is not here: each block has its own default (Empty List Icon).
 */
const MESSAGES = {
  // floating alert when a service fails or does not answer
  errorResponseMessage: 'No pudimos cargar la información. Intenta de nuevo más tarde.',
  // "nothing to show" message (empty list or service error)
  emptyListTitle: 'Por ahora no hay elementos disponibles',
  emptyListDescription: 'Vuelve pronto para descubrir nuestras novedades.',
};

export default MESSAGES;
