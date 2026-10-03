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
| Empty Elements Title | Por ahora no hay categorías disponibles |
| Empty Elements Description | Vuelve pronto para descubrir nuestras novedades. |
| Elements List Accessible Name | Categorías |
| Skeleton Count | *(vacío = 6)* |

## De dónde sale cada texto

| Fila | Para qué | Si la fila no existe o está vacía |
|---|---|---|
| `Title` | Título de la sección | No se muestra título |
| `Endpoint` | URL del servicio | Se usan las 6 categorías del JSON interno |
| `Alert Duration` / `Alert Color` | Duración (segundos) y color de la alerta de error | 5 s, `error` |
| `Error Response Message` | Texto de la alerta cuando el servicio falla o no responde | `scripts/messages.js` → `errorResponseMessage` |
| `Empty Elements Title` / `Empty Elements Description` | Aviso cuando no hay categorías que mostrar | `scripts/messages.js` → `emptyElementsTitle` / `emptyElementsDescription` |
| `Elements List Accessible Name` | Nombre de la lista para lectores de pantalla | El `Title`, o `scripts/messages.js` → `elementsListAccessibleName` |
| `Skeleton Count` | Tarjetas grises mientras carga (entero de 1 a 24) | `SKELETON_COUNT = 6` en `card-categories.js` |

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
- Lista: `div.card-categories-list[role=list]` con un `div.card-categories-card[role=listitem]` por
  categoría; dentro, el enlace `a.card-categories-item` (icono + nombre).
- Carga: `div.card-categories-skeleton` × Skeleton Count. Vacío o error: `div.card-categories-empty`.

Código: `blocks/card-categories/card-categories.js` y `blocks/card-categories/card-categories.css`.
