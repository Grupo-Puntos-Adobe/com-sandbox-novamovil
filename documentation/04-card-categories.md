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

## De dónde sale cada texto

**Fila que no existe ≠ fila vacía** en `Title`, `Empty List Title`, `Empty List Description` y `Empty List Icon`:

| La fila… | Resultado |
|---|---|
| no existe en la tabla | se usa el valor por defecto (columna de abajo) |
| existe pero está vacía | esa parte se deja vacía y no se pinta |
| tiene texto | se usa ese texto |

| Fila | Para qué | Por defecto (fila que no existe) |
|---|---|---|
| `Title` | Título de la sección | `DEFAULT_TITLE = 'Categorías'` en `card-categories.js` (vacía = sin título) |
| `Empty List Title` / `Empty List Description` | Aviso cuando no hay categorías que mostrar | `scripts/messages.js` → `emptyListTitle` / `emptyListDescription` |
| `Empty List Icon` | Icono de ese aviso (emoji o texto corto) | `EMPTY_LIST_ICON = '🗂️'` en `card-categories.js` |

Resto de filas (no existe **o** está vacía → por defecto):

| Fila | Para qué | Por defecto |
|---|---|---|
| `Endpoint` | URL del servicio | Se usan las 6 categorías del JSON interno |
| `Alert Duration` / `Alert Color` | Duración (segundos) y color de la alerta de error | 5 s, `error` |
| `Error Response Message` | Texto de la alerta cuando el servicio falla o no responde | `scripts/messages.js` → `errorResponseMessage` |

La regla la aplica `readRowText(block, fila, porDefecto)` de `scripts/block-utils.js`.

`scripts/messages.js` tiene los **mensajes genéricos** de todo el sitio ("No pudimos cargar la
información…"). Lo específico de cada bloque va en su tabla.

## Cómo se ve

| Resolución | Columnas | Tarjeta |
|---|---|---|
| mobile (< 768 px) | 1 | ancho completo, 105 px de alto |
| tablet (768–991 px) | 3 | se estiran para llenar la fila, 126 px de alto |
| desktop (≥ 992 px) | 6 | 140 px fijos, alineadas a la izquierda, 126 px de alto |

Al pasar el mouse, el borde y la sombra toman el `color` de cada categoría (del servicio) y la
tarjeta sube 4 px.

## HTML que genera (todo con `div`)

- Título: `div.card-categories-heading` con `role="heading" aria-level="2"`; su fuente viene de la regla
  global `[role='heading']` de `styles/styles.css` (el bloque no define `font-family`).
- Lista: `div.card-categories-list[role=list]`, con `aria-labelledby` apuntando al título (los lectores de
  pantalla la anuncian como "Categorías, lista"; con `Title` vacío no lleva nombre), con un `div.card-categories-card[role=listitem]` por
  categoría; dentro, el enlace `a.card-categories-item` (icono + nombre).
- Carga: `div.card-categories-skeleton` × `SKELETON_ELEMENTS` (6, constante en `card-categories.js`). Vacío o error: `div.card-categories-empty`.

Código: `blocks/card-categories/card-categories.js` y `blocks/card-categories/card-categories.css`.
