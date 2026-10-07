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

<div class="card-promotions"></div>

## Componente Card Promotions

Este componente permite a los usuarios **ver las promociones como tarjetas con foto, un degradado
del color de cada promoción, título y texto**, cada una con enlace a su página.
Las promociones llegan de un **servicio** (fila `Endpoint`) o, si no hay endpoint, del JSON interno
del bloque. Se acomoda solo a cada resolución con el grid del proyecto: 1 tarjeta por fila en móvil
y 3 en tablet y desktop.

### Características

- Promociones desde un servicio (`Endpoint`) o desde el JSON interno del bloque
- Título de la sección personalizable (sin título no se pinta)
- Enlace de cada promoción armado con una plantilla (`/promociones/{id}`) si el servicio no trae `path`
- Degradado de abajo hacia arriba con el color de cada promoción, sobre la foto
- Solo muestra promociones activas, con título, sin repetidas y ordenadas por `order`
- Si tiene enlace, al pasar el mouse la tarjeta sube 4 px; sin enlace se queda quieta
- Esqueleto de carga mientras responde el servicio (la página no salta)
- Alerta flotante configurable (duración y color) cuando el servicio falla
- Aviso de lista vacía configurable (título, descripción e icono)
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Adaptación a móvil, tablet y desktop con el grid (`styles/foundations/grid.css`)
- Accesible: lista con nombre para lectores de pantalla, título con `role="heading"`, foto decorativa
  (el título y el texto describen la promoción), foco visible y sin animación si el usuario pide
  menos movimiento
- Pintado seguro: lo que llega del servicio se pone siempre como texto (nunca HTML) y solo se
  aceptan enlaces e imágenes del mismo sitio o `http(s)`

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`card-promotions-*`) y las
clases del grid para las columnas. Todo se construye con `div` y roles ARIA, excepto el enlace de
cada tarjeta (`a`, un `div` si la promoción no tiene enlace) y la foto (`img`).

- `card-promotions` – Contenedor principal del componente (el bloque)
- `card-promotions-header` – Contenedor del título de la sección
- `card-promotions-heading` – Título de la sección (`role="heading"`, `aria-level="2"`)
- `card-promotions-grid` + `container-fluid` – Contenedor del grid (sin padding lateral)
- `card-promotions-list` + `row row-gutter-16 row-gutter-y-16` – Lista de tarjetas (`role="list"`),
  16 px entre tarjetas
- `card-promotions-card` + `col-24 col-md-8` – Columna de cada tarjeta (`role="listitem"`)
- `card-promotions-item` – Tarjeta y enlace a la promoción (`a`, o `div` sin enlace); lleva el color
  de la promoción en `--card-promotions-item-color`
- `card-promotions-image` – Foto de fondo (decorativa, `alt=""`)
- `card-promotions-content` – Contenedor de los textos
- `card-promotions-title` – Título de la promoción
- `card-promotions-sub` – Texto de la promoción
- `card-promotions-skeleton` – Tarjeta gris de carga
- `empty-list-message` – Aviso de lista vacía (bloque compartido `blocks/empty-list-message`)

```text
div.card-promotions
├─ div.card-promotions-header
│  └─ div.card-promotions-heading[role=heading][aria-level=2]
└─ div.card-promotions-grid.container-fluid
   └─ div.card-promotions-list.row.row-gutter-16.row-gutter-y-16[role=list][aria-label]
      └─ div.card-promotions-card.col-24.col-md-8[role=listitem]   × cada promoción
         └─ a.card-promotions-item   (div sin enlace)
            ├─ img.card-promotions-image[alt=""]
            └─ span.card-promotions-content
               ├─ span.card-promotions-title
               └─ span.card-promotions-sub
```

### Resoluciones

El grid acomoda las tarjetas solas en cada resolución:

| Resolución | Columnas (clase del grid) | Alto de la tarjeta |
|---|---|---|
| mobile (< 768 px) | 1 (`col-24`) | 168 px |
| tablet (768–991 px) | 3 (`col-md-8`) | 200 px |
| desktop (≥ 992 px) | 3 (`col-md-8`) | 200 px |

### Estructura de la tabla en Drive

El autor escribe una tabla **Card Promotions** en el documento de Drive. Todas las filas son
opcionales y pueden ir en cualquier orden.

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

4. **`Endpoint`**
    - **Tipo:** URL (texto o enlace)
    - **Descripción:** Servicio de donde llegan las promociones
    - **Por defecto:** sin fila, se usan las 3 promociones del JSON interno del bloque
      (`FALLBACK_PROMOTIONS`)

5. **`Promo Link`**
    - **Tipo:** Texto (plantilla con `{id}`)
    - **Descripción:** Enlace de cada tarjeta cuando la promoción no trae `path`, por ejemplo
      `/promociones/{id}`
    - **Por defecto:** ninguno. Sin él (y sin `path`), la tarjeta se muestra sin enlace

6. **`Alert Duration`**
    - **Tipo:** Número (segundos)
    - **Descripción:** Cuánto dura la alerta de error; `0` la deja hasta que el usuario la cierra
    - **Por defecto:** `5`

7. **`Alert Color`**
    - **Tipo:** Select
    - **Opciones:**
        - `error` – Rojo
        - `warning` – Ámbar
        - `success` – Verde
        - `info` – Azul
        - un color hex (por ejemplo `#1a4fd8`) – Fondo personalizado
    - **Descripción:** Color de la alerta de error
    - **Por defecto:** `error`

8. **`Error Response Message`**
    - **Tipo:** Texto
    - **Descripción:** Texto de la alerta cuando el servicio falla o no responde
    - **Por defecto:** `errorResponseMessage` de `scripts/foundations/messages.js` (también si la fila
      está vacía)

9. **`Empty List Title`**
    - **Tipo:** Texto
    - **Descripción:** Título del aviso cuando no hay promociones que mostrar
    - **Por defecto:** `emptyListTitle` de `scripts/foundations/messages.js`. Si la fila existe pero
      está vacía, no se pinta

10. **`Empty List Description`**
    - **Tipo:** Texto
    - **Descripción:** Descripción de ese aviso
    - **Por defecto:** `emptyListDescription` de `scripts/foundations/messages.js`. Si la fila existe
      pero está vacía, no se pinta

11. **`Empty List Icon`**
    - **Tipo:** Texto (emoji o texto corto)
    - **Descripción:** Icono de ese aviso
    - **Por defecto:** `🏷️` (`EMPTY_LIST_ICON` en `card-promotions.js`). Si la fila existe pero está
      vacía, no se pinta

Este bloque no tiene fila `Link` (solo Card Featured lleva el botón "Ver todos").

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- El **título** de la sección
- El **servicio** de donde llegan las promociones
- El **enlace** de cada tarjeta
- La **duración**, el **color** y el **texto** de la alerta de error
- El **título**, la **descripción** y el **icono** del aviso de lista vacía
- **Estilos** y **clases** extra del bloque

![Vista Tabla en Drive](/documentation/readme/card-promotions/drive-table.png)

### Propiedades del JSON

Cada promoción que llega del servicio (o del JSON interno) dentro de
`{ data: { promotions: [ … ] } }`:

1. `id` – Identificador; evita promociones repetidas y se usa en la plantilla de `Promo Link` (`{id}`)
2. `title` – Título que se muestra (obligatorio: sin título la promoción no se pinta)
3. `sub` – Texto debajo del título
4. `color` – Color hex del degradado (`#1a4fd8`); si no es válido usa el color por defecto
5. `img` – URL de la foto de fondo (también acepta `image`); si falla, se quita y queda el degradado
6. `active` – `false` oculta la promoción
7. `order` – Posición en la lista (de menor a mayor)
8. `path` – Enlace propio de la promoción (opcional; si viene, tiene prioridad sobre `Promo Link`)

```json
{
  "data": {
    "promotions": [
      {
        "id": "PROMO-001", "title": "Hasta 12 MSI",
        "sub": "En celulares seleccionados con tarjeta NovaPay", "color": "#1a4fd8",
        "img": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=220&fit=crop&auto=format",
        "active": true, "order": 1
      }
    ]
  }
}
```

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Sin `Endpoint` y el JSON interno tiene promociones | Las tarjetas del JSON interno |
| Sin `Endpoint` y el JSON interno está vacío o sin datos | Aviso de lista vacía, sin alerta |
| El servicio está respondiendo | Esqueleto de carga (3 tarjetas grises) |
| El servicio responde la lista vacía (o sin promociones activas) | Aviso de lista vacía, sin alerta |
| El servicio falla, no responde o la respuesta no trae la lista | Alerta (`Error Response Message`) + aviso de lista vacía |
| La foto de una promoción falta o no carga | La tarjeta queda con el degradado y los textos |
| Sin `Promo Link` y la promoción sin `path` | La tarjeta se muestra sin enlace y no sube al pasar el mouse |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/card-promotions/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/card-promotions/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/card-promotions/component-mobile.png)

### Archivos y dependencias

- `card-promotions.js` – Construye el bloque, lee la tabla y llama al servicio
- `card-promotions.css` – Estilos del bloque (tamaños, colores, degradado y estados; las columnas
  vienen del grid)
- `scripts/foundations/` – `block-options.js`, `block-utils.js`, `messages.js` y `toast.js`
- `scripts/api/http-client.js` – Llamada al servicio
- `blocks/empty-list-message/` – Aviso de lista vacía compartido
- `styles/foundations/grid.css` – Columnas y espacio entre tarjetas
- Colores en `styles/colors.css` (`--card-promotions-*`)

Integración del servicio: `documentation/02-integracion-endpoints.md`.
