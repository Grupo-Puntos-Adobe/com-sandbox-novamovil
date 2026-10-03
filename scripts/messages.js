/*
 * Generic messages shared by every NovaMóvil block.
 *
 * A block uses them only when its table in Drive does not bring its own text:
 *   | Error Response Message        | …  → errorResponseMessage
 *   | Empty Elements Title          | …  → emptyElementsTitle
 *   | Empty Elements Description    | …  → emptyElementsDescription
 *   | Elements List Accessible Name | …  → elementsListAccessibleName
 * Block-specific texts (e.g. "No pudimos cargar las categorías…") go in the table, not here.
 */
const MESSAGES = {
  // floating alert when a service fails or does not answer
  errorResponseMessage: 'No pudimos cargar la información. Intenta de nuevo más tarde.',
  // "nothing to show" message (empty list or service error)
  emptyElementsTitle: 'Por ahora no hay elementos disponibles',
  emptyElementsDescription: 'Vuelve pronto para descubrir nuestras novedades.',
  // name screen readers announce for a list without its own title
  elementsListAccessibleName: 'Elementos',
};

export default MESSAGES;
