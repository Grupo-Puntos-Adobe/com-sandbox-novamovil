/*
 * Generic messages shared by every NovaMóvil block.
 *
 * A block uses them only when its table in Drive does not bring its own text:
 *   | Error Message | …  → error       (floating alert when a service fails)
 *   | Empty Title   | …  → emptyTitle  (title of the "nothing to show" message)
 *   | Empty Text    | …  → emptyText   (text of the "nothing to show" message)
 *   | List Label    | …  → listLabel   (accessible name of a list without Title)
 * Block-specific texts (e.g. "No pudimos cargar las categorías…") go in the table, not here.
 */
const MESSAGES = {
  error: 'No pudimos cargar la información. Intenta de nuevo más tarde.',
  emptyTitle: 'Por ahora no hay elementos disponibles',
  emptyText: 'Vuelve pronto para descubrir nuestras novedades.',
  listLabel: 'Elementos',
};

export default MESSAGES;
