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

## De dónde sale cada texto

**Fila que no existe ≠ fila vacía** en `Title`, `Empty List Title`, `Empty List Description` y `Empty List Icon`:

| La fila… | Resultado |
|---|---|
| no existe en la tabla | se usa el valor por defecto (columna de abajo) |
| existe pero está vacía | esa parte se deja vacía y no se pinta |
| tiene texto | se usa ese texto |

| Fila | Para qué | Por defecto (fila que no existe) |
|---|---|---|
| `Title` | Título de la sección | `DEFAULT_TITLE = 'Productos destacados'` en `card-featured.js` (vacía = sin título) |
| `Empty List Title` / `Empty List Description` | Aviso cuando no hay productos que mostrar | `scripts/messages.js` → `emptyListTitle` / `emptyListDescription` |
| `Empty List Icon` | Icono de ese aviso (emoji o texto corto) | `EMPTY_LIST_ICON = '📦'` en `card-featured.js` |

Resto de filas (no existe **o** está vacía → por defecto):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Link` | Botón "Ver todos" a la derecha del título (texto y enlace de la celda) | Sin botón |
| `Endpoint` | URL del servicio | Se usan los 4 productos del JSON interno |
| `Product Link` | Enlace de cada tarjeta si el producto no trae `path`; acepta `{sku}`, `{productId}`, `{id}` | `/productos/{sku}` |
| `Button Text` | Texto del botón de cada tarjeta | `Ver producto` |
| `Alert Duration` / `Alert Color` | Duración (segundos) y color de la alerta de error | 5 s, `error` |
| `Error Response Message` | Texto de la alerta cuando el servicio falla o no responde | `scripts/messages.js` → `errorResponseMessage` |

La regla la aplica `readRowText(block, fila, porDefecto)` de `scripts/block-utils.js`.

Los textos que solo oyen los lectores de pantalla ("Precio", "Precio anterior", "Calificación 4.6 de
5, 2,341 reseñas") y "Imagen no disponible" (cuando falla la foto) no van en la tabla: están en
`LABELS` de `card-featured.js`.

## Cómo se ve

| Resolución | Columnas | Imagen |
|---|---|---|
| mobile (< 768 px) | 1 | 168 px de alto |
| tablet (768–991 px) | 2 | 200 px de alto |
| desktop (≥ 992 px) | 4 | 200 px de alto |

Todas las filas miden lo que la tarjeta más alta, y el botón queda pegado abajo. Toda la tarjeta
es clicable (abre el producto) y al pasar el mouse sube 4 px.

## HTML que genera (todo con `div`)

- Título: `div.card-featured-heading` con `role="heading" aria-level="2"`; a su lado,
  `a.card-featured-link` ("Ver todos").
- Lista: `div.card-featured-list[role=list]`, con `aria-labelledby` apuntando al título (con
  `Title` vacío no lleva nombre), con un `div.card-featured-item[role=listitem]` por producto.
- Tarjeta: `div.card-featured-media` (`img.card-featured-image`, etiquetas `-badge` y `-promo`) y
  `div.card-featured-body` con marca (`-brand`), nombre (`-name`, `role="heading" aria-level="3"`),
  calificación (`-rating`, `role="img"` con la etiqueta completa), precios (`-price` y
  `-old-price` con `role="deletion"`) y el enlace `a.card-featured-button`.
- Carga: `div.card-featured-skeleton` × `SKELETON_ELEMENTS` (4, constante en `card-featured.js`).
  Vacío o error: `div.card-featured-empty`.

Código: `blocks/card-featured/card-featured.js` y `blocks/card-featured/card-featured.css`.
