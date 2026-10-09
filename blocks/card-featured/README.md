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

<div class="card-featured"></div>

## Componente Card Featured

Este componente permite a los usuarios **ver los productos destacados como tarjetas con foto, marca,
nombre, calificación, precio y botón**, cada una con enlace al producto.
Los productos llegan de un **servicio** (fila `Endpoint`) o, si no hay endpoint, del JSON interno del
bloque. Se acomoda solo a cada resolución con el grid del proyecto: 1 tarjeta por fila en móvil,
2 en tablet y 4 en desktop.

### Características

- Productos desde un servicio (`Endpoint`) o desde el JSON interno del bloque
- Título de la sección y botón "Ver todos" personalizables (sin fila no se pintan)
- Enlace de cada producto armado con una plantilla (`/celulares/?sku={sku}`) si el servicio no trae `path`
- Botón de la tarjeta personalizable; sin `Button Text` el nombre del producto es el enlace
- Etiquetas sobre la foto (`badge` y `promo`), estrellas rellenas según la calificación y número de
  reseñas
- Precio y precio anterior tachado (solo si es mayor), con formato `$19,999` (`LOCALE` y `CURRENCY`
  de `scripts/foundations/messages.js`)
- Solo muestra productos activos, con nombre y precio, sin repetidos
- Texto en lugar de la foto si falta o no carga (`Image Error Message`)
- Las tarjetas de una fila miden lo que la más alta y el botón queda pegado abajo
- Si tiene enlace, toda la tarjeta es clicable y al pasar el mouse sube 4 px
- Esqueleto de carga mientras responde el servicio (la página no salta)
- Alerta flotante configurable (duración y color) cuando el servicio falla
- Aviso de lista vacía configurable (título, descripción e icono)
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Adaptación a móvil, tablet y desktop con el grid (`styles/foundations/grid.css`)
- Accesible: lista con nombre para lectores de pantalla, títulos con `role="heading"`, calificación y
  precios con etiquetas para lectores de pantalla, foco visible y sin animación si el usuario pide
  menos movimiento
- Pintado seguro: lo que llega del servicio se pone siempre como texto (nunca HTML) y solo se
  aceptan enlaces e imágenes del mismo sitio o `http(s)`

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`card-featured-*`) y las
clases del grid para las columnas (encabezado, lista y precios). Todo se construye con `div` y roles
ARIA, excepto la foto (`img`) y los enlaces (`a`).

- `card-featured` – Contenedor principal del componente (el bloque)
- `card-featured-header` – Contenedor del encabezado (título + "Ver todos")
- `card-featured-header-grid` + `container-fluid` – Grid del encabezado
- `card-featured-header-row` + `row row-middle row-gutter-16` – Fila del encabezado (`row-end` si no
  hay título)
- `card-featured-header-title` + `col` – Columna del título (llena el espacio)
- `card-featured-heading` – Título de la sección (`role="heading"`, `aria-level="2"`)
- `card-featured-header-action` + `col-auto` – Columna del botón (mide lo que su texto)
- `card-featured-link` – Botón "Ver todos" (`a`)
- `card-featured-grid` + `container-fluid` – Contenedor del grid de la lista (sin padding lateral)
- `card-featured-list` + `row row-gutter-16 row-gutter-y-16` – Lista de tarjetas (`role="list"`),
  16 px entre tarjetas
- `card-featured-cell` + `col-24 col-md-12 col-lg-6` – Columna de cada tarjeta (`role="listitem"`)
- `card-featured-item` – Tarjeta (borde y fondo)
- `card-featured-media` – Caja de la foto (`is-missing` si no hay foto)
- `card-featured-image` – Foto del producto (`img`)
- `card-featured-media-fallback` – Texto en lugar de la foto (`Image Error Message`)
- `card-featured-badge` – Etiqueta de la izquierda ("Más vendido")
- `card-featured-promo` – Etiqueta de la derecha ("13% OFF")
- `card-featured-body` – Contenido de la tarjeta
- `card-featured-brand` – Marca
- `card-featured-name` – Nombre del producto (`role="heading"`, `aria-level="3"`)
- `card-featured-name-link` – Enlace en el nombre (solo sin `Button Text`)
- `card-featured-rating` – Calificación (`role="img"` con la etiqueta completa)
- `card-featured-stars` – Estrellas (rellenas con `--card-featured-rating`)
- `card-featured-reviews` – Número de reseñas
- `card-featured-prices` + `container-fluid` – Grid de los precios
- `card-featured-prices-row` + `row row-gutter-8` – Fila de los precios
- `card-featured-price` + `col-auto` – Precio actual
- `card-featured-old-price` + `col-auto` – Precio anterior (`role="deletion"`)
- `card-featured-sr-only` – Texto solo para lectores de pantalla ("Precio", "Precio anterior")
- `card-featured-button` – Botón de la tarjeta (`a`, con `Button Text`)
- `card-featured-skeleton` – Tarjeta gris de carga
- `empty-list-message` – Aviso de lista vacía (bloque compartido `blocks/empty-list-message`)

```text
div.card-featured
├─ div.card-featured-header
│  └─ div.card-featured-header-grid.container-fluid
│     └─ div.card-featured-header-row.row.row-middle.row-gutter-16
│        ├─ div.card-featured-header-title.col
│        │  └─ div.card-featured-heading[role=heading][aria-level=2]
│        └─ div.card-featured-header-action.col-auto
│           └─ a.card-featured-link
└─ div.card-featured-grid.container-fluid
   └─ div.card-featured-list.row.row-gutter-16.row-gutter-y-16[role=list][aria-label]
      └─ div.card-featured-cell.col-24.col-md-12.col-lg-6[role=listitem]   × cada producto
         └─ div.card-featured-item
            ├─ div.card-featured-media
            │  ├─ img.card-featured-image
            │  ├─ div.card-featured-badge
            │  └─ div.card-featured-promo
            └─ div.card-featured-body
               ├─ div.card-featured-brand
               ├─ div.card-featured-name[role=heading][aria-level=3]
               ├─ div.card-featured-rating[role=img]
               │  ├─ span.card-featured-stars
               │  └─ span.card-featured-reviews
               ├─ div.card-featured-prices.container-fluid
               │  └─ div.card-featured-prices-row.row.row-gutter-8
               │     ├─ div.card-featured-price.col-auto
               │     └─ div.card-featured-old-price.col-auto[role=deletion]
               └─ a.card-featured-button
```

### Resoluciones

El grid acomoda las tarjetas solas en cada resolución:

| Resolución | Columnas (clase del grid) | Alto de la foto |
|---|---|---|
| mobile (< 768 px) | 1 (`col-24`) | 168 px |
| tablet (768–991 px) | 2 (`col-md-12`) | 200 px |
| desktop (≥ 992 px) | 4 (`col-lg-6`) | 200 px |

### Estructura de la tabla en Drive

El autor escribe una tabla **Card Featured** en el documento de Drive. Todas las filas son opcionales
y pueden ir en cualquier orden.

1. **`Styles`**
    - **Tipo:** Texto (declaraciones CSS separadas por `;`)
    - **Descripción:** Estilos en línea sobre el bloque, por ejemplo `margin-top: 20px; padding-left: 16px`
    - **Por defecto:** ninguno (ver `documentation/01-styles-classname.md`)

2. **`Classname`**
    - **Tipo:** Texto (nombres separados por espacio o coma)
    - **Descripción:** Clases extra sobre el bloque
    - **Por defecto:** ninguna

3. **`Title`**
    - **Tipo:** Texto
    - **Descripción:** Título de la sección; también da nombre a la lista para lectores de pantalla
    - **Por defecto:** ninguno. Si no viene o está vacío, no se pinta

4. **`Link`**
    - **Tipo:** Enlace (texto y link en la celda)
    - **Descripción:** Botón "Ver todos" a la derecha del título
    - **Por defecto:** ninguno. Sin texto o sin enlace válido, no se pinta

5. **`Endpoint`**
    - **Tipo:** URL (texto o enlace)
    - **Descripción:** Servicio de donde llegan los productos
    - **Por defecto:** sin fila, se usan los 4 productos del JSON interno del bloque
      (`FALLBACK_PRODUCTS`)

6. **`Product Link`**
    - **Tipo:** Texto (plantilla con `{sku}`, `{productId}` o `{id}`)
    - **Descripción:** Enlace de cada tarjeta cuando el producto no trae `path`, por ejemplo
      `/celulares/?sku={sku}`
    - **Por defecto:** ninguno. Sin él (y sin `path`), la tarjeta se muestra sin enlace

7. **`Button Text`**
    - **Tipo:** Texto
    - **Descripción:** Texto del botón de cada tarjeta
    - **Por defecto:** ninguno. Sin él, el **nombre del producto** es el enlace

8. **`Alert Duration`**
    - **Tipo:** Número (segundos)
    - **Descripción:** Cuánto dura la alerta de error; `0` la deja hasta que el usuario la cierra
    - **Por defecto:** `5`

9. **`Alert Color`**
    - **Tipo:** Select
    - **Opciones:**
        - `error` – Rojo
        - `warning` – Ámbar
        - `success` – Verde
        - `info` – Azul
        - un color hex (por ejemplo `#1a4fd8`) – Fondo personalizado
    - **Descripción:** Color de la alerta de error
    - **Por defecto:** `error`

10. **`Error Response Message`**
    - **Tipo:** Texto
    - **Descripción:** Texto de la alerta cuando el servicio falla o no responde
    - **Por defecto:** `errorResponseMessage` de `scripts/foundations/messages.js` (también si la fila
      está vacía)

11. **`Empty List Title`**
    - **Tipo:** Texto
    - **Descripción:** Título del aviso cuando no hay productos que mostrar
    - **Por defecto:** `emptyListTitle` de `scripts/foundations/messages.js`. Si la fila existe pero
      está vacía, no se pinta

12. **`Empty List Description`**
    - **Tipo:** Texto
    - **Descripción:** Descripción de ese aviso
    - **Por defecto:** `emptyListDescription` de `scripts/foundations/messages.js`. Si la fila existe
      pero está vacía, no se pinta

13. **`Empty List Icon`**
    - **Tipo:** Texto (emoji o texto corto)
    - **Descripción:** Icono de ese aviso
    - **Por defecto:** `📦` (`EMPTY_LIST_ICON` en `card-featured.js`). Si la fila existe pero está
      vacía, no se pinta

14. **`Image Error Message`**
    - **Tipo:** Texto
    - **Descripción:** Texto en lugar de una foto que falta o no carga
    - **Por defecto:** `imageErrorMessage` de `scripts/foundations/messages.js`. Si la fila existe
      pero está vacía, no se pinta

Los textos que solo oyen los lectores de pantalla ("Precio", "Precio anterior", "Calificación 4.6 de
5, 2,341 reseñas") no van en la tabla: están en `LABELS` de `card-featured.js`.

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- El **título** de la sección y el botón **"Ver todos"**
- El **servicio** de donde llegan los productos
- El **enlace** y el **botón** de cada tarjeta
- La **duración**, el **color** y el **texto** de la alerta de error
- El **título**, la **descripción** y el **icono** del aviso de lista vacía
- El **texto** en lugar de una foto que falla
- **Estilos** y **clases** extra del bloque

![Vista Tabla en Drive](/documentation/readme/card-featured/drive-table.png)

### Propiedades del JSON

Cada producto que llega del servicio (o del JSON interno) dentro de
`{ data: { products: [ … ] } }`:

1. `id` – Identificador; evita productos repetidos (si no viene usa `productId` o `sku`)
2. `sku` / `productId` – Se usan en la plantilla de `Product Link` (`{sku}`, `{productId}`)
3. `brand` – Marca
4. `name` – Nombre que se muestra (obligatorio; si no viene usa `model`)
5. `description` – Texto alternativo de la foto (si no viene usa marca + nombre)
6. `image` – URL de la foto
7. `price` – Precio actual (obligatorio: sin precio el producto no se pinta)
8. `oldPrice` – Precio anterior; solo se muestra si es mayor que `price`
9. `currency` – Moneda ISO de 3 letras (`MXN`); si no es válida usa `CURRENCY`
10. `promo` – Etiqueta de la derecha de la foto ("13% OFF")
11. `badge` – Etiqueta de la izquierda de la foto ("Más vendido")
12. `rating` – Calificación de 0 a 5 (rellena las estrellas)
13. `reviews` – Número de reseñas
14. `active` – `false` oculta el producto
15. `path` – Enlace propio del producto (opcional; si viene, tiene prioridad sobre `Product Link`)

```json
{
  "data": {
    "products": [
      {
        "id": "P001", "productId": "PROD-001", "sku": "IPH-15-128-BLK",
        "brand": "Apple", "name": "iPhone 15", "description": "Smartphone Apple iPhone 15 de 128GB.",
        "image": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80",
        "price": 19999, "oldPrice": 22999, "currency": "MXN", "promo": "13% OFF",
        "badge": "Más vendido", "rating": 4.6, "reviews": 2341, "active": true
      }
    ]
  }
}
```

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Sin `Endpoint` y el JSON interno tiene productos | Las tarjetas del JSON interno |
| Sin `Endpoint` y el JSON interno está vacío o sin datos | Aviso de lista vacía, sin alerta |
| El servicio está respondiendo | Esqueleto de carga (4 tarjetas grises) |
| El servicio responde la lista vacía (o sin productos activos) | Aviso de lista vacía, sin alerta |
| El servicio falla, no responde o la respuesta no trae la lista | Alerta (`Error Response Message`) + aviso de lista vacía |
| La foto de un producto falta o no carga | `Image Error Message` en lugar de la foto |
| Sin `Button Text` | El nombre del producto es el enlace |
| Sin `Product Link` y el producto sin `path` | La tarjeta se muestra sin enlace y no sube al pasar el mouse |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/card-featured/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/card-featured/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/card-featured/component-mobile.png)

### Archivos y dependencias

- `card-featured.js` – Construye el bloque, lee la tabla y llama al servicio
- `card-featured.css` – Estilos del bloque (tamaños, colores y estados; las columnas vienen del grid)
- `scripts/foundations/` – `block-options.js`, `block-utils.js` (incluye `formatPrice`), `messages.js`
  y `toast.js`
- `scripts/api/http-client.js` – Llamada al servicio
- `blocks/empty-list-message/` – Aviso de lista vacía compartido
- `styles/foundations/grid.css` – Columnas y espacio entre tarjetas
- Colores en `styles/colors.css` (`--card-featured-*`)

Integración del servicio: `documentation/02-integracion-endpoints.md`.
