# 04 · Card Categories: cómo se escribe en Drive

Tarjetas de categorías que llegan de un servicio (`Endpoint`) o, si no hay endpoint, del JSON
interno del bloque. Todas las filas son opcionales.

## La tabla

| Card Categories | |
|---|---|
| Styles | *(opcional, ver 01-styles-classname.md)* |
| Classname | *(opcional)* |
| Title | Categorías |
| Endpoint | https://…/api/v1/home/categories |
| Alert Duration | 5 |
| Alert Color | error |
| Error Response Message | No pudimos cargar las categorías. Intenta de nuevo más tarde. |
| Empty List Title | Por ahora no hay categorías disponibles |
| Empty List Description | Vuelve pronto para descubrir nuestras novedades. |
| Empty List Icon | 🗂️ |

## Qué lleva valor por defecto y qué no

Solo los **mensajes** (lo que dice la página cuando el servicio falla, no trae datos o falla una
foto) y la **configuración de la alerta** tienen valor por defecto. Lo que es **contenido**
(título, botones, enlaces) sale solo de la tabla: si no viene, no se pinta.

**1 · Contenido, sin valor por defecto** (fila que no existe o vacía → no se pinta):

| Fila | Para qué |
|---|---|
| `Title` | Título de la sección (sin título la lista no lleva nombre para lectores de pantalla) |

**2 · Mensajes, con valor por defecto** (fila que no existe → por defecto; fila vacía → no se pinta):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Empty List Title` / `Empty List Description` | Aviso cuando no hay categorías que mostrar | `scripts/foundations/messages.js` → `emptyListTitle` / `emptyListDescription` |
| `Empty List Icon` | Icono de ese aviso (emoji o texto corto) | `EMPTY_LIST_ICON = '🗂️'` en el JS del bloque |

**3 · Configuración, con valor por defecto** (fila que no existe o vacía → por defecto):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Endpoint` | URL del servicio | Sin fila: las 6 categorías del JSON interno del bloque; si ese JSON está vacío (`[]`) o sin datos (`null`), el aviso de lista vacía directo, sin alerta |
| `Alert Duration` / `Alert Color` | Duración (segundos) y color de la alerta de error | 5 s, `error` |
| `Error Response Message` | Texto de la alerta cuando el servicio falla o no responde | `scripts/foundations/messages.js` → `errorResponseMessage` |

Los mensajes genéricos están en `scripts/foundations/messages.js` (junto con `LOCALE` y `CURRENCY`, el idioma
y la moneda de los precios); la regla de "fila que no existe ≠ fila vacía" la aplica
`readRowTextOrDefault(block, fila, porDefecto)` de `scripts/foundations/block-utils.js`.

Este bloque no tiene fila `Link` (solo Card Featured lleva el botón "Ver todos").

## Cómo se ve

| Resolución | Columnas (clase del grid) | Tarjeta |
|---|---|---|
| mobile (< 768 px) | 1 (`col-24`) | ancho completo, 105 px de alto |
| tablet (768–991 px) | 3 (`col-md-8`) | llenan la fila, 126 px de alto |
| desktop (≥ 992 px) | 6 (`col-lg-4`) | llenan la fila, 126 px de alto |

Las columnas y el espacio entre tarjetas (16 px, `row-gutter-16 row-gutter-y-16`) vienen del grid
(`styles/foundations/grid.css`, ver su `README.md`), no del CSS del bloque. Las clases se ponen en
`card-categories.js` al crear la lista (`renderCategories` y `buildCategoriesSkeleton`) y cada
tarjeta (`buildCategoryCard` y el esqueleto): para cambiar cuántas van por fila, se cambian ahí.

Al pasar el mouse, el borde y la sombra toman el `color` de cada categoría (del servicio) y la
tarjeta sube 4 px.

## Cuándo sale el aviso de lista vacía

| Caso | Qué se ve |
|---|---|
| Sin `Endpoint` y el JSON interno tiene categorías | Las tarjetas del JSON interno |
| Sin `Endpoint` y el JSON interno está vacío o sin datos | Aviso de lista vacía, sin alerta |
| El servicio responde la lista vacía (o sin categorías activas) | Aviso de lista vacía, sin alerta |
| El servicio falla, no responde o la respuesta no trae la lista | Alerta (`Error Response Message`) + aviso de lista vacía |

## HTML que genera (todo con `div`)

- Título: `div.card-categories-heading` con `role="heading" aria-level="2"`; su fuente viene de la regla
  global `[role='heading']` de `styles/styles.css` (el bloque no define `font-family`).
- Grid: `div.card-categories-grid.container-fluid` > lista (`row`) > cada tarjeta (`col`). La estructura del grid
  siempre es container > row > col; va `container-fluid` (sin padding) porque la sección ya tiene
  margen lateral.
- Lista: `div.card-categories-list.row.row-gutter-16.row-gutter-y-16[role=list]` con `aria-label`
  igual al texto del título (los lectores de pantalla la anuncian como "Categorías, lista"; sin
  `Title` no lleva nombre), con un `div.card-categories-card.col-24.col-md-8.col-lg-4[role=listitem]`
  por categoría; dentro, el enlace `a.card-categories-item` (icono + nombre).
- Tamaños: todos están en `card-categories.css`; el JS no define ningún tamaño (el color de cada
  categoría sí llega del servicio, en `--card-categories-item-color`).
- Carga: las mismas columnas del grid, cada una con un `div.card-categories-skeleton`, ×
  `SKELETON_ELEMENTS` (6, constante en `card-categories.js`). Vacío o error: el aviso compartido `div.empty-list-message` (bloque `blocks/empty-list-message`,
  el mismo en las tres tarjetas; el bloque solo pinta el icono, el título y la descripción que le manda la tarjeta).

Código: `blocks/card-categories/card-categories.js` y `blocks/card-categories/card-categories.css`.
