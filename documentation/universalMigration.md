# Universal Migration

Archivos nuevos y archivos de la plantilla de AEM Edge Delivery que se modificaron.

| Archivo | Tipo | Qué se hizo |
|---|---|---|
| `.hlxignore` | Modificado | No publicar docs ni archivos internos |
| `404.html` | Modificado | Carga breakpoints, grid y colores |
| `head.html` | Modificado | Carga breakpoints, grid, colores y `session.js` (antes de `scripts.js`) |
| `AGENTS.md` | Modificado | Reglas del proyecto |
| `package.json` | Modificado | Lint de CSS en subcarpetas |
| `styles/styles.css` | Modificado | Fuente, tamaños y capas (z-index) |
| `styles/fonts.css` | Modificado | Fuente Plus Jakarta Sans |
| `styles/colors.css` | Nuevo | Todos los colores del sitio |
| `styles/foundations/breakpoints.css` | Nuevo | Resoluciones mobile, tablet y desktop |
| `styles/foundations/grid.css` | Nuevo | Grid de 24 columnas |
| `styles/foundations/toast.css` | Nuevo | Estilos de la alerta |
| `styles/foundations/sessions.css` | Nuevo | Clases para mostrar u ocultar por sesión |
| `styles/foundations/README.md` | Nuevo | Guía de breakpoints, grid, sesiones y alerta |
| `fonts/plus-jakarta-sans-*.woff2` | Nuevo | Archivos de la fuente |
| `fonts/roboto-*.woff2` | Modificado | Se quitaron (ya no se usan) |
| `icons/cart.svg`, `close.svg`, `logo.svg`, `user.svg` | Nuevo | Iconos del header |
| `scripts/api/http-client.js` | Nuevo | Llamadas a servicios |
| `scripts/api/interceptors.js` | Nuevo | Llamadas públicas y privadas (Bearer) |
| `scripts/api/README.md` | Nuevo | Guía de llamadas públicas y privadas |
| `scripts/foundations/block-options.js` | Nuevo | Filas Styles, Classname y Session, y filas por sesión |
| `scripts/foundations/block-utils.js` | Nuevo | Ayudas compartidas de los bloques |
| `scripts/foundations/messages.js` | Nuevo | Mensajes, idioma y moneda |
| `scripts/foundations/toast.js` | Nuevo | Alerta flotante |
| `scripts/foundations/page-context.js` | Nuevo | Datos compartidos entre bloques |
| `scripts/foundations/session.js` | Nuevo | Único archivo de sesión: arranca en todas las páginas, reglas de página y mostrar u ocultar por sesión |
| `scripts/foundations/README.md` | Nuevo | Guía de los JS portables |
| `blocks/header/` | Modificado | Header NovaMóvil |
| `blocks/footer/` | Modificado | Footer NovaMóvil |
| `blocks/cards/cards.css` | Modificado | Color de borde con variable |
| `blocks/hero-novamovil/` | Nuevo | Banner principal |
| `blocks/card-categories/` | Nuevo | Tarjetas de categorías |
| `blocks/card-featured/` | Nuevo | Productos destacados |
| `blocks/card-promotions/` | Nuevo | Promociones |
| `blocks/empty-list-message/` | Nuevo | Aviso de lista vacía |
| `blocks/breadcrumb/` | Nuevo | Ruta de navegación |
| `blocks/product-catalog/` | Nuevo | Catálogo con filtros |
| `blocks/product-detail/` | Nuevo | Detalle de un celular |
| `blocks/login/` | Nuevo | Inicio de sesión |
| `blocks/block-session-example/` | Nuevo | Ejemplo de sesiones |
| `blocks/account-profile/` | Nuevo | Mi cuenta: datos del usuario de la sesión |
| `documentation/06-styles-classname.md` | Nuevo | Guía de Styles y Classname |
| `documentation/07-integracion-endpoints.md` | Nuevo | Guía de servicios |
| `documentation/08-sesiones.md` | Nuevo | Guía de sesiones |
| `documentation/readme/` | Nuevo | Imágenes de los README |
| `content-drive/*.docx` | Nuevo | Documentos para Drive |
