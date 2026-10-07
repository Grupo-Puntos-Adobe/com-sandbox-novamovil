<!--
Copyright [2025] Adobe

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<div class="product-catalog"></div>

## Componente Product Catalog

Este componente permite a los usuarios **buscar celulares con filtros (marca, sistema operativo,
capacidad y precio máximo), ordenarlos y recorrer los resultados por páginas**.
Los filtros llegan de un servicio (`Filters Endpoint`, GET) y los celulares de una búsqueda
(`Search Endpoint`, POST) que se repite cada vez que el usuario cambia un filtro, el orden o la
página. Sin endpoints usa el JSON interno del bloque. En tablet y desktop los filtros van en una caja
a la izquierda; en móvil se abren en un panel con el botón **Filtros**.

### Características

- Título de la página, contador ("19 productos encontrados") y selector **Ordenar por**
- Filtros desde el servicio: casillas de marca, sistema operativo y capacidad, y deslizador de
  precio máximo (de `priceRange.min` a `priceRange.max`)
- Cada cambio de filtro, orden o página vuelve a buscar; un filtro u orden nuevo vuelve a la página 1
- Una búsqueda nueva cancela la anterior (solo se pinta la última respuesta)
- El deslizador busca al soltarlo; mientras se mueve solo cambia el precio mostrado
- Paginador "‹ 1 2 3 ›" cuando el servicio trae más de una página
- Tarjeta de celular: foto con etiqueta y descuento, marca, disponibilidad, nombre, capacidad y RAM,
  precio, precio anterior tachado y botón; toda la tarjeta abre el producto y sube 4 px al pasar el
  mouse
- Enlace de cada celular armado con una plantilla (`/productos/{sku}`) si el servicio no trae `path`
- Esqueleto de carga mientras responde el servicio (la página no salta)
- Alerta flotante configurable (duración y color) cuando un servicio falla; una sola alerta si fallan
  los dos al cargar
- Aviso de lista vacía configurable (título, descripción e icono)
- Texto en lugar de la foto si falta o no carga (`Image Error Message`)
- Móvil: botón **Filtros** con el número de filtros activos, panel a pantalla completa, botón
  **Ver resultados**, cierre con × o `Escape`, y la página no se desplaza detrás del panel
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Adaptación a móvil, tablet y desktop con el grid (`styles/foundations/grid.css`)
- Accesible: título principal con `role="heading"` y `aria-level="1"`, contador con `role="status"`,
  grupos de filtros con nombre, deslizador con el precio en `aria-valuetext`, paginador con
  `aria-current="page"`, foco visible y sin animación si el usuario pide menos movimiento
- Pintado seguro: lo que llega del servicio se pone siempre como texto (nunca HTML) y solo se
  aceptan enlaces e imágenes del mismo sitio o `http(s)`

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`product-catalog-*`) y las
clases del grid para las columnas. Todo se construye con `div` y roles ARIA, excepto los enlaces
(`a`), las imágenes (`img`), los botones (`button`) y los controles de formulario (`label`, `input`
y `select`).

**Barra superior**

- `product-catalog-toolbar` + `container-fluid` – Grid de la barra
- `product-catalog-toolbar-row` + `row row-middle row-gutter-16` – Fila de la barra
- `product-catalog-col-title` + `col-24 col-md` – Columna del título y el contador
- `product-catalog-title` – Título (`role="heading"`, `aria-level="1"`)
- `product-catalog-count` – Contador de resultados (`role="status"`)
- `product-catalog-col-controls` + `col-24 col-md-auto` – Columna de los controles
- `product-catalog-controls` + `container-fluid` > `product-catalog-controls-row` +
  `row row-middle row-gutter-8` – Grid de los controles
- `product-catalog-toggle-field` + `col-auto` – Columna del botón Filtros (solo móvil)
- `product-catalog-filters-toggle` – Botón **Filtros** (`aria-expanded`, `aria-controls`)
- `product-catalog-filters-toggle-text` / `-badge` – Texto y número de filtros activos
- `product-catalog-sort-field` + `col col-md-auto` – Columna de **Ordenar por**
- `product-catalog-sort-label` – Etiqueta del orden (`label`)
- `product-catalog-sort` – Selector del orden (`select`)

**Filtros**

- `product-catalog-layout` + `container-fluid` > `product-catalog-layout-row` + `row row-gutter-32`
  – Grid de filtros + resultados
- `product-catalog-col-filters` + `col-24 col-md-8 col-lg-5` – Columna de los filtros
- `product-catalog-filters` – Caja de filtros (`role="region"`); `is-open` con el panel móvil abierto
- `product-catalog-filters-header` – Título de los filtros + botón cerrar
- `product-catalog-filters-title` – Título "Filtros" (`role="heading"`, `aria-level="2"`)
- `product-catalog-filters-close` – Botón × (solo móvil)
- `product-catalog-filters-body` – Grupos de filtros
- `product-catalog-filter-group` – Cada grupo (`role="group"`); `product-catalog-price-group` en el
  de precio
- `product-catalog-filter-label` – Nombre del grupo ("MARCA")
- `product-catalog-filter-options` – Opciones del grupo
- `product-catalog-option` – Cada opción (`label`)
- `product-catalog-checkbox` – Casilla (`input type="checkbox"`)
- `product-catalog-option-text` – Texto de la opción
- `product-catalog-range` – Deslizador de precio (`input type="range"`)
- `product-catalog-range-limits` – Fila con el mínimo y el valor elegido
- `product-catalog-range-min` / `product-catalog-range-value` – Precio mínimo y precio máximo elegido
- `product-catalog-filters-footer` / `product-catalog-filters-apply` – Botón **Ver resultados**
  (solo móvil)

**Resultados**

- `product-catalog-col-results` + `col-24 col-md-16 col-lg-19` – Columna de los resultados
- `product-catalog-results` – Resultados (`aria-busy` mientras busca)
- `product-catalog-grid` + `container-fluid` – Grid de la lista
- `product-catalog-list` + `row row-gutter-16 row-gutter-y-16` – Lista de celulares (`role="list"`)
- `product-catalog-cell` + `col-24 col-lg-6` – Columna de cada celular (`role="listitem"`)
- `product-catalog-card` – Tarjeta
- `product-catalog-media` – Caja de la foto
- `product-catalog-image` – Foto (`img`)
- `product-catalog-media-fallback` – Texto en lugar de la foto
- `product-catalog-badge` / `product-catalog-promo` – Etiqueta ("Más vendido") y descuento
  ("13% OFF")
- `product-catalog-body` – Contenido de la tarjeta
- `product-catalog-meta` + `container-fluid` > `product-catalog-meta-row` +
  `row row-middle row-gutter-8` – Fila de marca + disponibilidad
- `product-catalog-brand` + `col` – Marca
- `product-catalog-status` + `col-auto` – Disponibilidad (`is-available` / `is-sold-out`)
- `product-catalog-name` – Nombre (`role="heading"`, `aria-level="2"`)
- `product-catalog-name-link` – Enlace en el nombre (solo sin `Button Text`)
- `product-catalog-chips` / `product-catalog-chip` – Capacidad y RAM (`role="list"` / `listitem`)
- `product-catalog-prices` – Precios
- `product-catalog-price` – Precio actual
- `product-catalog-old-price` – Precio anterior (`role="deletion"`)
- `product-catalog-sr-only` – Texto solo para lectores de pantalla ("Precio anterior")
- `product-catalog-button` – Botón **Ver producto** (`a`)
- `product-catalog-pagination` – Paginador (`role="navigation"`)
- `product-catalog-page` – Botón de página (`is-previous`, `is-number`, `is-next`; `aria-current`)
- `product-catalog-page-gap` – "…" entre páginas lejanas
- `product-catalog-skeleton` / `product-catalog-filters-skeleton` – Tarjetas y caja grises de carga
- `empty-list-message` – Aviso de lista vacía (bloque compartido `blocks/empty-list-message`)
- `has-product-catalog-filters-open` – Se pone en `body` mientras el panel móvil está abierto

```text
div.product-catalog
├─ div.product-catalog-toolbar.container-fluid
│  └─ div.row.row-middle.row-gutter-16
│     ├─ div.product-catalog-col-title.col-24.col-md
│     │  ├─ div.product-catalog-title[role=heading][aria-level=1]
│     │  └─ div.product-catalog-count[role=status]
│     └─ div.product-catalog-col-controls.col-24.col-md-auto
│        └─ div.product-catalog-controls.container-fluid > div.row.row-middle.row-gutter-8
│           ├─ div.col-auto > button.product-catalog-filters-toggle   (solo móvil)
│           └─ div.product-catalog-sort-field.col.col-md-auto
│              ├─ label.product-catalog-sort-label
│              └─ select.product-catalog-sort
└─ div.product-catalog-layout.container-fluid
   └─ div.row.row-gutter-32
      ├─ div.product-catalog-col-filters.col-24.col-md-8.col-lg-5
      │  └─ div.product-catalog-filters[role=region]
      │     ├─ div.product-catalog-filters-header (título + ×)
      │     ├─ div.product-catalog-filters-body
      │     │  ├─ div.product-catalog-filter-group[role=group]   × marca, sistema, capacidad
      │     │  │  └─ label.product-catalog-option > input.product-catalog-checkbox + span
      │     │  └─ div.product-catalog-filter-group.product-catalog-price-group
      │     │     └─ input.product-catalog-range + div.product-catalog-range-limits
      │     └─ div.product-catalog-filters-footer > button.product-catalog-filters-apply
      └─ div.product-catalog-col-results.col-24.col-md-16.col-lg-19
         └─ div.product-catalog-results
            ├─ div.product-catalog-grid.container-fluid
            │  └─ div.product-catalog-list.row.row-gutter-16.row-gutter-y-16[role=list]
            │     └─ div.product-catalog-cell.col-24.col-lg-6[role=listitem]   × cada celular
            │        └─ div.product-catalog-card
            │           ├─ div.product-catalog-media (img + badge + promo)
            │           └─ div.product-catalog-body
            │              ├─ div.product-catalog-meta.container-fluid > row > brand.col + status.col-auto
            │              ├─ div.product-catalog-name[role=heading][aria-level=2]
            │              ├─ div.product-catalog-chips[role=list]
            │              ├─ div.product-catalog-prices (price + old-price)
            │              └─ a.product-catalog-button
            └─ div.product-catalog-pagination[role=navigation]
               └─ button.product-catalog-page   × ‹, cada página, ›
```

### Resoluciones

| Resolución | Filtros | Celulares por fila (clase del grid) | Ordenar por |
|---|---|---|---|
| mobile (< 768 px) | botón **Filtros** que abre un panel a pantalla completa (debajo del header) | 1 (`col-24`) | junto al botón Filtros, ocupa el resto de la fila |
| tablet (768–991 px) | caja a la izquierda, 1/3 del ancho (`col-md-8`) | 1, tarjeta ancha (`col-24`) | a la derecha del título |
| desktop (≥ 992 px) | caja a la izquierda, ~1/5 del ancho (`col-lg-5`) | 4 (`col-lg-6`) | a la derecha del título |

La caja de la foto mide 160 px de alto; la foto, 152 px (140 px en desktop).

### Estructura de la tabla en Drive

El autor escribe una tabla **Product Catalog** en el documento de Drive. Todas las filas son
opcionales y pueden ir en cualquier orden.

1. **`Styles`** / **`Classname`**
    - **Tipo:** Texto
    - **Descripción:** Estilos en línea y clases extra del bloque
    - **Por defecto:** ninguno (ver `documentation/01-styles-classname.md`)

2. **`Title`**
    - **Tipo:** Texto
    - **Descripción:** Título principal de la página ("Celulares"); también da nombre a la lista
    - **Por defecto:** ninguno. Si no viene o está vacío, no se pinta

3. **`Results Text`** / **`Results Text One`**
    - **Tipo:** Texto con `{count}`
    - **Descripción:** Contador de resultados ("{count} productos encontrados"); `Results Text One` se
      usa cuando hay un solo resultado ("{count} producto encontrado")
    - **Por defecto:** ninguno. Sin `Results Text` no hay contador; sin `Results Text One` se usa
      `Results Text` también para uno

4. **`Sort Label`**
    - **Tipo:** Texto
    - **Descripción:** Etiqueta del selector de orden ("Ordenar por:")
    - **Por defecto:** ninguno. Sin ella el selector no lleva etiqueta visible

5. **`Filters Title`**
    - **Tipo:** Texto
    - **Descripción:** Título de la caja de filtros y texto del botón móvil
    - **Por defecto:** ninguno para el título; el botón móvil dice "Filtros"

6. **`Brand Label`** / **`OS Label`** / **`Storage Label`** / **`Price Label`**
    - **Tipo:** Texto
    - **Descripción:** Nombre de cada grupo de filtros (Marca, Sistema operativo, Capacidad, Precio
      máximo)
    - **Por defecto:** ninguno. El grupo se muestra sin nombre visible

7. **`Apply Text`**
    - **Tipo:** Texto
    - **Descripción:** Botón que cierra el panel de filtros en móvil ("Ver resultados")
    - **Por defecto:** ninguno. Sin él, el panel se cierra con × o `Escape`

8. **`Filters Endpoint`**
    - **Tipo:** URL (texto o enlace)
    - **Descripción:** Servicio GET de las opciones de filtro
    - **Por defecto:** sin fila, los filtros del JSON interno (`FALLBACK_FILTERS`)

9. **`Search Endpoint`**
    - **Tipo:** URL (texto o enlace)
    - **Descripción:** Servicio POST de la búsqueda de celulares
    - **Por defecto:** sin fila, los 6 celulares del JSON interno (`FALLBACK_PHONES`), filtrados,
      ordenados y paginados en el navegador

10. **`Category`**
    - **Tipo:** Texto
    - **Descripción:** Categoría que se manda en la búsqueda (`data.category`, por ejemplo
      `SMARTPHONES`)
    - **Por defecto:** sin fila, no se manda

11. **`Page Size`**
    - **Tipo:** Número
    - **Descripción:** Celulares por página (`data.pageSize`)
    - **Por defecto:** `30`

12. **`Product Link`**
    - **Tipo:** Texto (plantilla con `{sku}`, `{productId}` o `{id}`)
    - **Descripción:** Enlace de cada tarjeta cuando el celular no trae `path`
    - **Por defecto:** ninguno. Sin él (y sin `path`), la tarjeta se muestra sin enlace

13. **`Button Text`**
    - **Tipo:** Texto
    - **Descripción:** Botón de cada tarjeta ("Ver producto")
    - **Por defecto:** ninguno. Sin él, el **nombre** del celular es el enlace

14. **`Available Text`** / **`Sold Out Text`**
    - **Tipo:** Texto
    - **Descripción:** Disponibilidad de cada celular ("● Disponible" en verde, "Agotado" en gris)
    - **Por defecto:** ninguno. Sin la fila, esa disponibilidad no se pinta

15. **`Alert Duration`** / **`Alert Color`**
    - **Tipo:** Número (segundos) / Select (`error`, `warning`, `success`, `info` o un color hex)
    - **Descripción:** Duración y color de la alerta de error
    - **Por defecto:** `5` y `error`

16. **`Error Response Message`**
    - **Tipo:** Texto
    - **Descripción:** Texto de la alerta cuando un servicio falla o no responde
    - **Por defecto:** `errorResponseMessage` de `scripts/foundations/messages.js` (también si la fila
      está vacía)

17. **`Empty List Title`** / **`Empty List Description`** / **`Empty List Icon`**
    - **Tipo:** Texto (el icono, emoji o texto corto)
    - **Descripción:** Aviso cuando no hay celulares que mostrar
    - **Por defecto:** `emptyListTitle` / `emptyListDescription` de `scripts/foundations/messages.js`
      y `📱` (`EMPTY_LIST_ICON`). Si la fila existe pero está vacía, no se pinta

18. **`Image Error Message`**
    - **Tipo:** Texto
    - **Descripción:** Texto en lugar de una foto que falta o no carga
    - **Por defecto:** `imageErrorMessage` de `scripts/foundations/messages.js`. Si la fila existe pero
      está vacía, no se pinta

Las opciones de **Ordenar por** y los textos que solo oyen los lectores de pantalla ("Cerrar
filtros", "Página anterior"…) no van en la tabla: están en `SORT_OPTIONS` y `LABELS` de
`product-catalog.js`.

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- El **título**, el **contador** y la etiqueta de **Ordenar por**
- El **título** y los **nombres de los grupos** de filtros, y el botón **Ver resultados**
- Los **servicios** de filtros y de búsqueda, la **categoría** y los **celulares por página**
- El **enlace**, el **botón** y la **disponibilidad** de cada tarjeta
- La **duración**, el **color** y el **texto** de la alerta de error
- El **título**, la **descripción** y el **icono** del aviso de lista vacía
- El **texto** en lugar de una foto que falla
- **Estilos** y **clases** extra del bloque

![Vista Tabla en Drive](/documentation/readme/product-catalog/drive-table.png)

### Propiedades del JSON

**Filtros** (`GET Filters Endpoint`), dentro de `{ data: { … } }`:

1. `brands` – Marcas (casillas del grupo Marca)
2. `operatingSystems` – Sistemas operativos (casillas del grupo Sistema operativo)
3. `storages` – Capacidades (casillas del grupo Capacidad)
4. `priceRange.min` / `priceRange.max` – Límites del deslizador de precio (empieza en el máximo)

```json
{
  "data": {
    "brands": ["Apple", "Samsung", "Motorola", "Xiaomi", "Google"],
    "operatingSystems": ["iOS", "Android"],
    "storages": ["128 GB", "256 GB", "512 GB"],
    "priceRange": { "min": 5000, "max": 40000 }
  }
}
```

**Búsqueda** (`POST Search Endpoint`). Lo que se manda: `meta` y `security` son fijos
(`SEARCH_REQUEST_META` y `SEARCH_REQUEST_SECURITY` en `product-catalog.js`); solo `data` cambia con
lo que elige el usuario. Una lista vacía significa "sin filtro de ese tipo".

1. `category` – Fila `Category` (no se manda si no hay fila)
2. `minPrice` – `priceRange.min` de los filtros
3. `maxPrice` – Precio elegido en el deslizador
4. `page` – Página actual (vuelve a `1` con cada filtro u orden nuevo)
5. `pageSize` – Fila `Page Size`
6. `brands` / `os` / `storage` – Casillas marcadas de cada grupo
7. `sortBy` – `relevancia`, `precio-asc`, `precio-desc` o `mejor-calificados`

```json
{
  "meta": { "requestId": "REQ-PROD-001", "correlationId": "CORR-000001", "timestamp": "2026-09-17T16:00:00Z", "channel": "WEB", "platform": "DESKTOP" },
  "security": { "auth": { "type": "Bearer", "value": "Bearer {{bearer_token}}" }, "nonce": "NONCE-PROD-001", "signature": "{{hmac_signature}}" },
  "data": {
    "category": "SMARTPHONES", "minPrice": 5000, "maxPrice": 40000, "page": 1, "pageSize": 30,
    "brands": ["Apple", "Samsung"], "os": ["iOS", "Android"], "storage": ["128 GB", "256 GB"],
    "sortBy": "relevancia"
  }
}
```

Lo que se recibe: `pagination` y la lista de celulares en `data` (también acepta `data.products`):

1. `pagination.totalItems` – Total de resultados (contador); si no viene, la cantidad de celulares
2. `pagination.totalPages` – Total de páginas (paginador); si no viene, se calcula con `Page Size`
3. `id` – Identificador; evita celulares repetidos (si no viene usa `productId` o `sku`)
4. `sku` / `productId` – Se usan en la plantilla de `Product Link`
5. `brand` – Marca
6. `name` – Nombre (obligatorio; si no viene usa `model`)
7. `storage` / `ram` – Chips de capacidad y RAM
8. `salePrice` – Precio de venta que se muestra (si no viene, `price`; sin precio no se pinta)
9. `oldPrice` – Precio anterior; solo se muestra si es mayor que el precio de venta
10. `currency` – Moneda ISO de 3 letras; si no es válida usa `CURRENCY`
11. `promo` / `badge` – Descuento y etiqueta sobre la foto
12. `available` / `stock` – `available: false` o `stock: 0` → "Agotado"
13. `image` (o `imageUrl`) y `description` – Foto y su texto alternativo
14. `rating` – Calificación (ordena "Mejor calificados" sin endpoint)
15. `active` – `false` oculta el celular
16. `path` – Enlace propio del celular (opcional; tiene prioridad sobre `Product Link`)

```json
{
  "pagination": { "page": 1, "pageSize": 30, "totalItems": 19, "totalPages": 1 },
  "data": [
    {
      "id": "PROD-001", "productId": "PROD-001", "sku": "IPH-15-128-BLK", "brand": "Apple",
      "name": "iPhone 15", "storage": "128 GB", "ram": "6 GB", "os": "iOS",
      "price": 19999, "salePrice": 19999, "oldPrice": 22999, "promo": "13% OFF",
      "badge": "Más vendido", "currency": "MXN", "stock": 18, "available": true, "active": true,
      "rating": 4.6, "image": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80"
    }
  ]
}
```

> **Mock de Postman:** hoy la búsqueda devuelve siempre los mismos 19 celulares en una sola página,
> sin importar lo que se mande en `data`. El bloque ya manda los filtros, el orden y la página; los
> resultados cambiarán cuando el servicio real filtre y pagine.

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Cargando | Caja de filtros y 4 tarjetas grises |
| Marcar o desmarcar una casilla, cambiar el orden o soltar el deslizador | Nueva búsqueda desde la página 1 |
| Cambiar de página | Nueva búsqueda de esa página; la barra superior vuelve a quedar a la vista |
| Varios cambios rápidos | Solo se pinta la respuesta del último |
| El servicio de filtros falla | Alerta + filtros del JSON interno |
| La búsqueda falla | Alerta + aviso de lista vacía; filtros y orden siguen funcionando |
| Fallan los dos al cargar | Una sola alerta |
| No hay celulares con esos filtros | Aviso de lista vacía, sin alerta; "0 productos encontrados" |
| Una sola página de resultados | No se pinta el paginador |
| La foto de un celular falta o no carga | `Image Error Message` en lugar de la foto |
| Celular sin stock | "Agotado" en gris |
| Sin `Search Endpoint` | Los 6 celulares del JSON interno, filtrados y ordenados en el navegador |
| Móvil: abrir **Filtros** | Panel a pantalla completa; se cierra con **Ver resultados**, × o `Escape` |

### Vista previa

Desktop (con paginador):

![Vista Componente desktop](/documentation/readme/product-catalog/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/product-catalog/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/product-catalog/component-mobile.png)

Móvil con el panel de filtros abierto:

![Vista Componente móvil con filtros](/documentation/readme/product-catalog/component-mobile-filters.png)

### Archivos y dependencias

- `product-catalog.js` – Lee la tabla, llama a los dos servicios y construye barra, filtros,
  tarjetas y paginador
- `product-catalog.css` – Estilos del bloque (tamaños, colores, panel móvil y resoluciones; las
  columnas vienen del grid)
- `scripts/foundations/` – `block-options.js`, `block-utils.js` (incluye `formatPrice`),
  `messages.js` y `toast.js`
- `scripts/api/http-client.js` – `get` (filtros) y `post` (búsqueda, con cancelación)
- `blocks/empty-list-message/` – Aviso de lista vacía compartido
- `styles/foundations/grid.css` – Columnas y espacios
- Colores en `styles/colors.css` (`--product-catalog-*`); `--nav-height` y `--z-index-panel` en
  `styles/styles.css` para el panel móvil
- Se usa en: la página Celulares, después de `blocks/breadcrumb/`

Integración de servicios: `documentation/02-integracion-endpoints.md`.
