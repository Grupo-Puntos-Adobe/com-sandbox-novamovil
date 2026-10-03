# 06 · Card Promotions: cómo se escribe en Drive

Tarjetas de promociones (foto + degradado del color de la promoción) que llegan de un servicio
(`Endpoint`) o, si no hay endpoint, del JSON interno del bloque. Todas las filas son opcionales.

## La tabla

| Card Promotions | |
|---|---|
| Styles | *(opcional, ver 01-styles-classname.md)* |
| Classname | *(opcional)* |
| Title | Promociones |
| Endpoint | https://…/api/v1/home/promotions |
| Promo Link | /promociones/{id} |
| Alert Duration | 5 |
| Alert Color | error |
| Error Response Message | No pudimos cargar las promociones. Intenta de nuevo más tarde. |
| Empty List Title | Por ahora no hay promociones disponibles |
| Empty List Description | Vuelve pronto para descubrir nuestras nuevas ofertas. |
| Empty List Icon | 🏷️ |

## Qué lleva valor por defecto y qué no

Solo los **mensajes** (lo que dice la página cuando el servicio falla, no trae datos o falla una
foto) y la **configuración de la alerta** tienen valor por defecto. Lo que es **contenido**
(título, botones, enlaces) sale solo de la tabla: si no viene, no se pinta.

**1 · Contenido, sin valor por defecto** (fila que no existe o vacía → no se pinta):

| Fila | Para qué |
|---|---|
| `Title` | Título de la sección (sin título la lista no lleva nombre para lectores de pantalla) |
| `Promo Link` | Enlace de cada tarjeta si la promoción no trae `path`; acepta `{id}`. Sin él (y sin `path`), la tarjeta se muestra sin enlace |

**2 · Mensajes, con valor por defecto** (fila que no existe → por defecto; fila vacía → no se pinta):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Empty List Title` / `Empty List Description` | Aviso cuando no hay promociones que mostrar | `scripts/messages.js` → `emptyListTitle` / `emptyListDescription` |
| `Empty List Icon` | Icono de ese aviso (emoji o texto corto) | `EMPTY_LIST_ICON = '🏷️'` en el JS del bloque |

**3 · Configuración, con valor por defecto** (fila que no existe o vacía → por defecto):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Endpoint` | URL del servicio | Sin fila: las 3 promociones del JSON interno del bloque; si ese JSON está vacío (`[]`) o sin datos (`null`), el aviso de lista vacía directo, sin alerta |
| `Alert Duration` / `Alert Color` | Duración (segundos) y color de la alerta de error | 5 s, `error` |
| `Error Response Message` | Texto de la alerta cuando el servicio falla o no responde | `scripts/messages.js` → `errorResponseMessage` |

Los mensajes genéricos están en `scripts/messages.js` (junto con `LOCALE` y `CURRENCY`, el idioma
y la moneda de los precios); la regla de "fila que no existe ≠ fila vacía" la aplica
`readRowTextOrDefault(block, fila, porDefecto)` de `scripts/block-utils.js`.

Este bloque no tiene fila `Link` (solo Card Featured lleva el botón "Ver todos").

## Cómo se ve

| Resolución | Columnas (clase del grid) | Tarjeta |
|---|---|---|
| mobile (< 768 px) | 1 (`col-24`) | ancho completo, 168 px de alto |
| tablet y desktop (≥ 768 px) | 3 (`col-md-8`) | llenan la fila, 200 px de alto |

Las columnas y el espacio entre tarjetas (16 px, `row-gutter-16 row-gutter-y-16`) vienen del grid
(`styles/foundations/grid.css`, ver su `README.md`), no del CSS del bloque. Las clases se ponen en
`card-promotions.js` al crear la lista (`renderPromotions` y `buildPromotionsSkeleton`) y cada
tarjeta (`buildPromotionCard` y el esqueleto): para cambiar cuántas van por fila, se cambian ahí.

El degradado de abajo hacia arriba usa el `color` de cada promoción (del servicio); al pasar el
mouse la tarjeta sube 4 px (solo si tiene enlace).

## Cuándo sale el aviso de lista vacía

| Caso | Qué se ve |
|---|---|
| Sin `Endpoint` y el JSON interno tiene promociones | Las tarjetas del JSON interno |
| Sin `Endpoint` y el JSON interno está vacío o sin datos | Aviso de lista vacía, sin alerta |
| El servicio responde la lista vacía (o sin promociones activas) | Aviso de lista vacía, sin alerta |
| El servicio falla, no responde o la respuesta no trae la lista | Alerta (`Error Response Message`) + aviso de lista vacía |

## HTML que genera (todo con `div`)

- Título: `div.card-promotions-heading` con `role="heading" aria-level="2"`.
- Lista: `div.card-promotions-list.row.row-gutter-16.row-gutter-y-16[role=list]` con `aria-label`
  igual al texto del título (sin `Title` no lleva nombre), con un
  `div.card-promotions-card.col-24.col-md-8[role=listitem]` por promoción;
  dentro, el enlace `a.card-promotions-item` (un `div` si la promoción no tiene enlace) con la
  foto decorativa (`img.card-promotions-image`), el título (`-title`) y el texto (`-sub`).
- Carga: las mismas columnas del grid, cada una con un `div.card-promotions-skeleton`, ×
  `SKELETON_ELEMENTS` (3, constante en `card-promotions.js`). Vacío o error:
  `div.card-promotions-empty`.
- Tamaños: todos están en `card-promotions.css`. La foto no lleva `width`/`height` en el JS: cubre
  toda la tarjeta (168 px de alto en móvil, 200 px desde tablet). El color de cada promoción sí
  llega del servicio, en `--card-promotions-item-color`.

Código: `blocks/card-promotions/card-promotions.js` y `blocks/card-promotions/card-promotions.css`.
