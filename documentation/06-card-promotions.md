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

## De dónde sale cada texto

**Fila que no existe ≠ fila vacía** en `Title`, `Empty List Title`, `Empty List Description` y `Empty List Icon`:

| La fila… | Resultado |
|---|---|
| no existe en la tabla | se usa el valor por defecto (columna de abajo) |
| existe pero está vacía | esa parte se deja vacía y no se pinta |
| tiene texto | se usa ese texto |

| Fila | Para qué | Por defecto (fila que no existe) |
|---|---|---|
| `Title` | Título de la sección | `DEFAULT_TITLE = 'Promociones'` en `card-promotions.js` (vacía = sin título) |
| `Empty List Title` / `Empty List Description` | Aviso cuando no hay promociones que mostrar | `scripts/messages.js` → `emptyListTitle` / `emptyListDescription` |
| `Empty List Icon` | Icono de ese aviso (emoji o texto corto) | `EMPTY_LIST_ICON = '🏷️'` en `card-promotions.js` |

Resto de filas (no existe **o** está vacía → por defecto):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Endpoint` | URL del servicio | Se usan las 3 promociones del JSON interno |
| `Promo Link` | Enlace de cada tarjeta si la promoción no trae `path`; acepta `{id}` | `/promociones/{id}` |
| `Alert Duration` / `Alert Color` | Duración (segundos) y color de la alerta de error | 5 s, `error` |
| `Error Response Message` | Texto de la alerta cuando el servicio falla o no responde | `scripts/messages.js` → `errorResponseMessage` |

La regla la aplica `readRowText(block, fila, porDefecto)` de `scripts/block-utils.js`.
Este bloque no tiene fila `Link` (solo Card Featured lleva el botón "Ver todos").

## Cómo se ve

| Resolución | Columnas | Tarjeta |
|---|---|---|
| mobile (< 768 px) | 1 | ancho completo, 168 px de alto |
| tablet y desktop (≥ 768 px) | 3 | se estiran para llenar la fila, 200 px de alto |

El degradado de abajo hacia arriba usa el `color` de cada promoción (del servicio); al pasar el
mouse la tarjeta sube 4 px.

## HTML que genera (todo con `div`)

- Título: `div.card-promotions-heading` con `role="heading" aria-level="2"`.
- Lista: `div.card-promotions-list[role=list]`, con `aria-labelledby` apuntando al título (con
  `Title` vacío no lleva nombre), con un `div.card-promotions-card[role=listitem]` por promoción;
  dentro, el enlace `a.card-promotions-item` con la foto decorativa (`img.card-promotions-image`),
  el título (`-title`) y el texto (`-sub`).
- Carga: `div.card-promotions-skeleton` × `SKELETON_ELEMENTS` (3, constante en
  `card-promotions.js`). Vacío o error: `div.card-promotions-empty`.

Código: `blocks/card-promotions/card-promotions.js` y `blocks/card-promotions/card-promotions.css`.
