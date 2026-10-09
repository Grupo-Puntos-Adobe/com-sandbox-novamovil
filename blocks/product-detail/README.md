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

<div class="product-detail"></div>

## Componente Product Detail

Este componente permite a los usuarios **ver el detalle de un celular: fotos, precio, colores,
capacidad, disponibilidad, cantidad y características**.
La URL de cada celular es `/celulares/{sku}` (por ejemplo `/celulares/iph-15-128-blk`), que es lo
que arman las tarjetas del catálogo y de destacados. Es un solo documento para todos los celulares
(`celulares/producto`); en la configuración del sitio, la carpeta `/celulares/` se mapea a ese
documento (*folder mapping*). También acepta `?sku=iph-15-128-blk`. Todo viene del servicio de detalle (`Endpoint`, POST): **no tiene JSON interno**. En móvil
va en una columna; desde tablet, la galería a la izquierda y la información a la derecha.

### Características

- El sku sale del último tramo de la URL (`/celulares/iph-15-128-blk`) o de `?sku=`; sin sku (la
  carpeta o el propio documento `producto`) la página regresa al catálogo (`Catalog Link`)
- Galería: foto grande y miniaturas cuando el servicio trae varias fotos (`images`)
- Etiqueta y descuento, marca, nombre (título principal de la página), estrellas, calificación y
  reseñas
- Precio, precio anterior tachado, "Ahorras $5,000" y "O 12 MSI de $2,500/mes sin intereses"
  (calculado con `Installments Months`)
- Color (muestras con el color del servicio y su nombre si viene), capacidad, disponibilidad y
  cantidad (de 1 al stock, máximo 10)
- Botón **Agregar al carrito** (por ahora solo se pinta; se conectará con la pantalla del carrito) y
  corazón de favoritos que se marca y desmarca
- Caja de beneficios (envío, compra segura, devoluciones) desde las filas `Benefit N`
- Tabla **Características principales** (`specs` del servicio)
- El breadcrumb termina con el nombre del celular (`{product}`) y la pestaña del navegador también
- Esqueleto de carga, alerta si el servicio falla y aviso "no disponible" con enlace al catálogo
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Adaptación a móvil, tablet y desktop con el grid (`styles/foundations/grid.css`)
- Accesible: título con `role="heading"` y `aria-level="1"`, opciones con `aria-pressed`, miniatura
  elegida con `aria-current`, calificación con etiqueta completa, foco visible
- Pintado seguro: lo que llega del servicio se pone siempre como texto (nunca HTML) y solo se
  aceptan enlaces e imágenes del mismo sitio o `http(s)`

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`product-detail-*`) y las
clases del grid para las columnas. Todo se construye con `div` y roles ARIA, excepto los enlaces
(`a`), las imágenes (`img`) y los botones (`button`).

- `product-detail-layout` + `container-fluid` > `product-detail-layout-row` +
  `row row-gutter-48 row-gutter-y-24` – Grid de galería + información
- `product-detail-col-gallery` / `product-detail-col-info` + `col-24 col-md-12` – Columnas
- `product-detail-gallery` – Galería
- `product-detail-media` / `product-detail-image` – Caja y foto grande
- `product-detail-media-fallback` – Texto en lugar de la foto
- `product-detail-thumbnails` + `container-fluid` > `product-detail-thumbnails-row` +
  `row row-gutter-8` > `product-detail-thumbnail-cell` + `col-8` – Miniaturas
- `product-detail-thumbnail` / `product-detail-thumbnail-image` – Botón e imagen de cada miniatura
  (`aria-current` en la elegida)
- `product-detail-tags`, `product-detail-badge`, `product-detail-promo` – Etiqueta y descuento
- `product-detail-brand` – Marca
- `product-detail-title` – Nombre (`role="heading"`, `aria-level="1"`)
- `product-detail-rating`, `-stars`, `-rating-value`, `-reviews` – Calificación (`role="img"`)
- `product-detail-prices`, `-price`, `-price-line`, `-old-price`, `-savings` – Precios y ahorro
- `product-detail-installments` / `-installments-highlight` – Meses sin intereses
- `product-detail-field`, `-field-label`, `-field-value` – Cada opción con su etiqueta
- `product-detail-colors` / `product-detail-swatch` – Colores (`role="group"`, `aria-pressed`)
- `product-detail-storages` / `product-detail-storage` – Capacidades (`aria-pressed`)
- `product-detail-stock` – Disponibilidad (`is-available` / `is-sold-out`)
- `product-detail-quantity`, `-stepper`, `-step`, `-quantity-value` – Cantidad
- `product-detail-actions` + `container-fluid` > `product-detail-actions-row` + `row row-gutter-8`
  – Botones
- `product-detail-cart-cell` + `col` > `product-detail-cart` – Agregar al carrito
- `product-detail-favorite-cell` + `col-auto` > `product-detail-favorite` – Favoritos
  (`aria-pressed`)
- `product-detail-benefits` / `-benefit` / `-benefit-icon` / `-benefit-text` – Beneficios
- `product-detail-specs`, `-specs-title` – Características principales
- `product-detail-specs-table` + `container-fluid` (`role="table"`) > `product-detail-spec` +
  `row row-gutter-16` (`role="row"`) – Tabla
- `product-detail-spec-label` + `col-9 col-md-6 col-lg-4` / `product-detail-spec-value` +
  `col-15 col-md-18 col-lg-20` – Etiqueta y valor
- `product-detail-back` – Enlace al catálogo en el aviso "no disponible"
- `product-detail-skeleton` (`-skeleton-media`, `-skeleton-line`) – Esqueleto de carga
- `product-detail-sr-only` – Texto solo para lectores de pantalla ("Precio anterior")
- `empty-list-message` – Aviso "no disponible" (bloque compartido `blocks/empty-list-message`)

```text
div.product-detail
├─ div.product-detail-layout.container-fluid
│  └─ div.row.row-gutter-48.row-gutter-y-24
│     ├─ div.product-detail-col-gallery.col-24.col-md-12
│     │  └─ div.product-detail-gallery
│     │     ├─ div.product-detail-media > img.product-detail-image
│     │     └─ div.product-detail-thumbnails.container-fluid > div.row.row-gutter-8
│     │        └─ div.col-8 > button.product-detail-thumbnail   × cada foto
│     └─ div.product-detail-col-info.col-24.col-md-12
│        ├─ div.product-detail-tags · div.product-detail-brand
│        ├─ div.product-detail-title[role=heading][aria-level=1]
│        ├─ div.product-detail-rating[role=img]
│        ├─ div.product-detail-prices (price · price-line · installments)
│        ├─ div.product-detail-field > div.product-detail-colors[role=group] > button.product-detail-swatch
│        ├─ div.product-detail-field > div.product-detail-storages[role=group] > button.product-detail-storage
│        ├─ div.product-detail-stock
│        ├─ div.product-detail-quantity > div.product-detail-stepper
│        ├─ div.product-detail-actions.container-fluid > div.row.row-gutter-8
│        │  ├─ div.col > button.product-detail-cart
│        │  └─ div.col-auto > button.product-detail-favorite
│        └─ div.product-detail-benefits[role=list]
└─ div.product-detail-specs
   ├─ div.product-detail-specs-title[role=heading][aria-level=2]
   └─ div.product-detail-specs-table.container-fluid[role=table]
      └─ div.product-detail-spec.row.row-gutter-16[role=row]   × cada característica
         ├─ div.product-detail-spec-label.col-9.col-md-6.col-lg-4[role=rowheader]
         └─ div.product-detail-spec-value.col-15.col-md-18.col-lg-20[role=cell]
```

### Resoluciones

| Resolución | Galería e información | Foto principal | Nombre | Características |
|---|---|---|---|---|
| mobile (< 768 px) | una debajo de otra (`col-24`) | cuadrada, ancho completo | 24 px | etiqueta 3/8 · valor 5/8 |
| tablet (768–991 px) | dos columnas (`col-md-12`) | cuadrada, la mitad del ancho | 26 px | etiqueta 1/4 · valor 3/4 |
| desktop (≥ 992 px) | dos columnas (`col-md-12`) | caja de 376 px de alto | 32 px | etiqueta 1/6 · valor 5/6 |

### Estructura de la tabla en Drive

El autor escribe una tabla **Product Detail** en el documento `celulares/producto` de Drive (debajo
del **Breadcrumb** con `Level 3` = `{product}`). Todas las filas son opcionales.

1. **`Styles`** / **`Classname`** – Estilos en línea y clases extra del bloque (ver
   `documentation/01-styles-classname.md`)
2. **`Endpoint`** – URL (texto o enlace) del servicio POST de detalle. Sin fila no se pinta producto:
   sale el aviso "no disponible" (no hay JSON interno)
3. **`Catalog Link`** – A dónde regresa la página sin sku y el enlace del aviso. Por defecto, la
   carpeta de la página (`/celulares`)
4. **`Back Text`** – Texto del enlace al catálogo en el aviso ("Ver todos los celulares"). Sin fila no
   se pinta el enlace
5. **`Color Label`** / **`Storage Label`** / **`Quantity Label`** – Etiquetas de color, capacidad y
   cantidad. Sin fila no se pinta la etiqueta
6. **`Reviews Text`** – Reseñas con `{count}` ("({count} reseñas)"). Sin fila solo salen las
   estrellas y la calificación
7. **`Savings Text`** – Ahorro con `{amount}` ("Ahorras {amount}"). Sin fila no se pinta
8. **`Installments Text`** + **`Installments Months`** – "O {months} MSI de {amount}/mes sin
   intereses" y el número de meses (12). Sin alguna de las dos no se pinta
9. **`In Stock Text`** / **`Sold Out Text`** – Disponibilidad. Sin fila no se pinta
10. **`Button Text`** – Botón "Agregar al carrito". Sin fila no se pinta
11. **`Benefit 1`, `Benefit 2`…** – Icono (emoji) en la 2.ª celda y texto en la 3.ª. Sin filas no hay
    caja de beneficios
12. **`Specs Title`** – Título de la tabla ("Características principales")
13. **`Alert Duration`** / **`Alert Color`** – Duración y color de la alerta de error (5 s, `error`)
14. **`Error Response Message`** – Texto de la alerta. Por defecto, `errorResponseMessage` de
    `scripts/foundations/messages.js`
15. **`Empty List Title`** / **`Empty List Description`** / **`Empty List Icon`** – Aviso "no
    disponible". Por defecto, `messages.js` y `📱`; fila vacía → no se pinta
16. **`Image Error Message`** – Texto en lugar de una foto que falla. Por defecto, `messages.js`

Los textos que solo oyen los lectores de pantalla ("Imagen 2 de 3", "Aumentar cantidad", "Agregar a
favoritos"…) están en `LABELS` de `product-detail.js`.

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- El **servicio** y el **enlace al catálogo**
- Las **etiquetas** de color, capacidad y cantidad, y el texto de **reseñas**
- El **ahorro**, los **meses sin intereses** y la **disponibilidad**
- El botón **Agregar al carrito** y los **beneficios**
- El título de **Características principales**
- La **alerta**, el aviso **no disponible** y el texto de **foto que falla**

![Vista Tabla en Drive](/documentation/readme/product-detail/drive-table.png)

### Propiedades del JSON

**Lo que se manda** (`POST Endpoint`): `meta` y `security` son fijos (`DETAIL_REQUEST_META` y
`DETAIL_REQUEST_SECURITY`); solo cambia `data.productId`, que es el sku de la URL en minúsculas.

```json
{
  "meta": { "requestId": "REQ-DET-001", "correlationId": "CORR-001", "timestamp": "2026-09-17T16:00:00Z", "channel": "WEB", "platform": "DESKTOP" },
  "security": { "auth": { "type": "Bearer", "value": "Bearer {{bearer_token}}" }, "nonce": "NONCE-REQ-DET-001", "signature": "{{hmac_signature}}" },
  "data": { "productId": "iph-15-128-blk" }
}
```

**Lo que se recibe**, dentro de `data`:

1. `brand` – Marca
2. `model` (o `name`) – Nombre (obligatorio: sin nombre o sin precio sale "no disponible")
3. `salePrice` / `price` – Precio que se muestra (el de venta si viene)
4. `oldPrice` – Precio anterior; solo si es mayor (con él sale "Ahorras…")
5. `currency` – Moneda ISO de 3 letras; si no viene, `CURRENCY`
6. `badge` / `promo` – Etiqueta ("Más vendido") y descuento ("14% OFF")
7. `image` (o `images[]`) – Foto; con varias se arman las miniaturas
8. `colors[]` – Colores en hex (`"#1c1c1e"`) o `{ "name": "Titanio Negro", "hex": "#1c1c1e" }`
9. `storage` (o `storages[]`) – Capacidad o capacidades
10. `rating` / `reviews` – Calificación (0 a 5) y número de reseñas
11. `available` / `stock` – `available: false` o `stock: 0` → "Agotado"; el stock limita la cantidad
12. `specs[]` – `{ "label": "Pantalla", "value": "6.1\" OLED 120Hz" }`

```json
{
  "data": {
    "id": "iphone-15-pro", "brand": "Apple", "model": "iPhone 15 Pro",
    "price": 29999, "oldPrice": 34999, "promo": "14% OFF", "badge": "Más vendido",
    "image": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&h=600&fit=crop&auto=format",
    "storage": "256 GB", "ram": "8 GB", "colors": ["#1c1c1e", "#e8d5b7", "#4a4a4a"],
    "rating": 4.8, "reviews": 1243, "available": true,
    "specs": [{ "label": "Pantalla", "value": "6.1\" OLED 120Hz" }, { "label": "Procesador", "value": "A17 Pro" }]
  }
}
```

> **Cómo existe `/celulares/{sku}`:** en Edge Delivery cada URL es un documento y no hay uno por
> celular. Hoy lo resuelve la página 404 del sitio: `404.html` usa `scripts/fallback-routes.js` para
> cargar el documento `celulares/producto` cuando la URL es `/celulares/{sku}`, y el usuario ve el
> detalle normal (el servidor responde 404, que no es ideal para SEO). Cuando Adobe active el
> *folder mapping* (`/celulares/` → `/celulares/producto`), el servidor responderá esa página
> directamente y la página 404 ya no se usará para estas URLs.

> **Mock de Postman:** hoy devuelve siempre el iPhone 15 Pro, con una sola foto, una capacidad y
> colores sin nombre. El bloque ya acepta `images[]`, `storages[]`, colores con nombre y `stock` para
> cuando el servicio real los mande.

### Comportamiento

| Caso | Qué se ve |
|---|---|
| URL sin sku (`/celulares/` o `/celulares/producto`) | Regresa al catálogo (`Catalog Link`), sin dejar la página vacía en el historial |
| Cargando | Esqueleto de la foto y de la información |
| El servicio responde el celular | Detalle completo; el breadcrumb y la pestaña muestran "Apple iPhone 15 Pro" |
| El servicio falla | Alerta + aviso "no disponible" con enlace al catálogo |
| El servicio responde sin celular | Aviso "no disponible", sin alerta |
| Sin fila `Endpoint` | Aviso "no disponible" (no hay datos de ejemplo) |
| La foto falla | `Image Error Message` en lugar de la foto |
| Sin stock | "Agotado"; cantidad y **Agregar al carrito** desactivados |
| Clic en una miniatura | Cambia la foto grande |
| Clic en un color o capacidad | Queda elegido; el nombre del color cambia (si el servicio lo trae) |
| − / + | Cantidad entre 1 y el stock (máximo 10) |
| **Agregar al carrito** | Por ahora no hace nada (se conectará con la pantalla del carrito) |
| Corazón | Se marca y desmarca (sin guardar todavía) |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/product-detail/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/product-detail/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/product-detail/component-mobile.png)

### Archivos y dependencias

- `product-detail.js` – Lee la tabla y el sku de la URL, llama al servicio y construye la página
- `product-detail.css` – Estilos del bloque (tamaños, colores y resoluciones; las columnas vienen del
  grid)
- `scripts/foundations/` – `block-options.js`, `block-utils.js` (incluye `formatPrice`),
  `messages.js`, `toast.js` y `page-context.js` (nombre del celular para el breadcrumb)
- `scripts/api/http-client.js` – `post` al servicio de detalle
- `blocks/empty-list-message/` – Aviso "no disponible"
- `blocks/breadcrumb/` – Ruta con el nivel `{product}`
- `404.html` + `scripts/fallback-routes.js` – Pintan `celulares/producto` para `/celulares/{sku}`
- `styles/foundations/grid.css` – Columnas y espacios
- Colores en `styles/colors.css` (`--product-detail-*`)
- Se llega desde: `blocks/product-catalog/` y `blocks/card-featured/` (`Product Link` =
  `/celulares/{sku}`)

Integración de servicios: `documentation/02-integracion-endpoints.md`.
