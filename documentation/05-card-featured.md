# 05 · Card Featured: cómo se escribe en Drive

Tarjetas de productos destacados que llegan de un servicio (`Endpoint`) o, si no hay endpoint, del
JSON interno del bloque. Todas las filas son opcionales.

## La tabla

| Card Featured | |
|---|---|
| Styles | *(opcional, ver 01-styles-classname.md)* |
| Classname | *(opcional)* |
| Title | Productos destacados |
| Link | [Ver todos](/celulares) |
| Endpoint | https://…/api/v1/products/featured |
| Product Link | /productos/{sku} |
| Button Text | Ver producto |
| Alert Duration | 5 |
| Alert Color | error |
| Error Response Message | No pudimos cargar los productos destacados. Intenta de nuevo más tarde. |
| Empty List Title | Por ahora no hay productos destacados |
| Empty List Description | Vuelve pronto para descubrir nuestras ofertas. |
| Empty List Icon | 📦 |
| Image Error Message | Imagen no disponible |

## Qué lleva valor por defecto y qué no

Solo los **mensajes** (lo que dice la página cuando el servicio falla, no trae datos o falla una
foto) y la **configuración de la alerta** tienen valor por defecto. Lo que es **contenido**
(título, botones, enlaces) sale solo de la tabla: si no viene, no se pinta.

**1 · Contenido, sin valor por defecto** (fila que no existe o vacía → no se pinta):

| Fila | Para qué |
|---|---|
| `Title` | Título de la sección (sin título la lista no lleva nombre para lectores de pantalla) |
| `Link` | Botón "Ver todos" a la derecha del título (texto y enlace de la celda) |
| `Button Text` | Botón de cada tarjeta. Sin él, el **nombre del producto** es el enlace y la tarjeta se sigue abriendo |
| `Product Link` | Enlace de cada tarjeta si el producto no trae `path`; acepta `{sku}`, `{productId}`, `{id}`. Sin él (y sin `path`), la tarjeta se muestra sin enlace |

**2 · Mensajes, con valor por defecto** (fila que no existe → por defecto; fila vacía → no se pinta):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Empty List Title` / `Empty List Description` | Aviso cuando no hay productos que mostrar | `scripts/messages.js` → `emptyListTitle` / `emptyListDescription` |
| `Empty List Icon` | Icono de ese aviso (emoji o texto corto) | `EMPTY_LIST_ICON = '📦'` en el JS del bloque |
| `Image Error Message` | Texto en lugar de una foto que falta o no carga | `scripts/messages.js` → `imageErrorMessage` |

**3 · Configuración, con valor por defecto** (fila que no existe o vacía → por defecto):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Endpoint` | URL del servicio | Sin fila: los 4 productos del JSON interno del bloque; si ese JSON está vacío (`[]`) o sin datos (`null`), el aviso de lista vacía directo, sin alerta |
| `Alert Duration` / `Alert Color` | Duración (segundos) y color de la alerta de error | 5 s, `error` |
| `Error Response Message` | Texto de la alerta cuando el servicio falla o no responde | `scripts/messages.js` → `errorResponseMessage` |

Los mensajes genéricos están en `scripts/messages.js` (junto con `LOCALE` y `CURRENCY`, el idioma
y la moneda de los precios); la regla de "fila que no existe ≠ fila vacía" la aplica
`readRowTextOrDefault(block, fila, porDefecto)` de `scripts/block-utils.js`.

Los textos que solo oyen los lectores de pantalla ("Precio", "Precio anterior", "Calificación 4.6 de
5, 2,341 reseñas") no van en la tabla: están en `LABELS` de `card-featured.js`.

## Cómo se ve

| Resolución | Columnas | Imagen |
|---|---|---|
| mobile (< 768 px) | 1 | 168 px de alto |
| tablet (768–991 px) | 2 | 200 px de alto |
| desktop (≥ 992 px) | 4 | 200 px de alto |

Todas las filas miden lo que la tarjeta más alta, y el botón queda pegado abajo. Si la tarjeta tiene
enlace, toda ella es clicable (abre el producto) y al pasar el mouse sube 4 px; sin enlace se queda
quieta.

## Cuándo sale el aviso de lista vacía

| Caso | Qué se ve |
|---|---|
| Sin `Endpoint` y el JSON interno tiene productos | Las tarjetas del JSON interno |
| Sin `Endpoint` y el JSON interno está vacío o sin datos | Aviso de lista vacía, sin alerta |
| El servicio responde la lista vacía (o sin productos activas) | Aviso de lista vacía, sin alerta |
| El servicio falla, no responde o la respuesta no trae la lista | Alerta (`Error Response Message`) + aviso de lista vacía |

## HTML que genera (todo con `div`)

- Título: `div.card-featured-heading` con `role="heading" aria-level="2"`; a su lado,
  `a.card-featured-link` ("Ver todos").
- Lista: `div.card-featured-list[role=list]`, con `aria-labelledby` apuntando al título (sin
  `Title` no lleva nombre), con un `div.card-featured-item[role=listitem]` por producto.
- Tarjeta: `div.card-featured-media` (`img.card-featured-image`, etiquetas `-badge` y `-promo`) y
  `div.card-featured-body` con marca (`-brand`), nombre (`-name`, `role="heading" aria-level="3"`),
  calificación (`-rating`, `role="img"` con la etiqueta completa), precios (`-price` y
  `-old-price` con `role="deletion"`) y el enlace `a.card-featured-button` (con `Button Text`) o
  `a.card-featured-name-link` dentro del nombre (sin `Button Text`).
- Carga: `div.card-featured-skeleton` × `SKELETON_ELEMENTS` (4, constante en `card-featured.js`).
  Vacío o error: `div.card-featured-empty`.

Código: `blocks/card-featured/card-featured.js` y `blocks/card-featured/card-featured.css`.
