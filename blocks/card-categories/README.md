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

<div class="card-categories"></div>

## Componente Card Categories

Este componente permite a los usuarios **ver las categorías de la tienda como tarjetas con icono y
nombre**, cada una con enlace a su página.
Las categorías llegan de un **servicio** (fila `Endpoint`) o, si no hay endpoint, del JSON interno del
bloque. Se acomoda solo a cada resolución con el grid del proyecto: 1 tarjeta por fila en móvil,
3 en tablet y 6 en desktop.

### Características

- Categorías desde un servicio (`Endpoint`) o desde el JSON interno del bloque
- Título de la sección personalizable (sin título no se pinta)
- Solo muestra categorías activas, con nombre y enlace válido, sin repetidas y ordenadas por `order`
- Color propio de cada categoría al pasar el mouse (borde, sombra y la tarjeta sube 4 px)
- Esqueleto de carga mientras responde el servicio (la página no salta)
- Alerta flotante configurable (duración y color) cuando el servicio falla
- Aviso de lista vacía configurable (título, descripción e icono)
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Adaptación a móvil, tablet y desktop con el grid (`styles/foundations/grid.css`)
- Accesible: lista con nombre para lectores de pantalla, título con `role="heading"`, foco visible y
  sin animación si el usuario pide menos movimiento
- Pintado seguro: lo que llega del servicio se pone siempre como texto (nunca HTML) y solo se
  aceptan enlaces del mismo sitio o `http(s)`

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`card-categories-*`) y las
clases del grid para las columnas. Todo se construye con `div` y roles ARIA, excepto el enlace de
cada tarjeta (`a`).

- `card-categories` – Contenedor principal del componente (el bloque)
- `card-categories-header` – Contenedor del título de la sección
- `card-categories-heading` – Título de la sección (`role="heading"`, `aria-level="2"`)
- `card-categories-grid` + `container-fluid` – Contenedor del grid (sin padding lateral)
- `card-categories-list` + `row row-gutter-16 row-gutter-y-16` – Lista de tarjetas (`role="list"`),
  16 px entre tarjetas
- `card-categories-card` + `col-24 col-md-8 col-lg-4` – Columna de cada tarjeta (`role="listitem"`)
- `card-categories-item` – Tarjeta y enlace a la categoría (`a`)
- `card-categories-icon` – Icono de la categoría (decorativo, `aria-hidden="true"`)
- `card-categories-label` – Nombre de la categoría
- `card-categories-skeleton` – Tarjeta gris de carga
- `empty-list-message` – Aviso de lista vacía (bloque compartido `blocks/empty-list-message`)

```text
div.card-categories
├─ div.card-categories-header
│  └─ div.card-categories-heading[role=heading][aria-level=2]
└─ div.card-categories-grid.container-fluid
   └─ div.card-categories-list.row.row-gutter-16.row-gutter-y-16[role=list][aria-label]
      └─ div.card-categories-card.col-24.col-md-8.col-lg-4[role=listitem]   × cada categoría
         └─ a.card-categories-item
            ├─ span.card-categories-icon[aria-hidden=true]
            └─ span.card-categories-label
```

### Resoluciones

El grid acomoda las tarjetas solas en cada resolución:

| Resolución | Columnas (clase del grid) | Alto de la tarjeta |
|---|---|---|
| mobile (< 768 px) | 1 (`col-24`) | 105 px |
| tablet (768–991 px) | 3 (`col-md-8`) | 126 px |
| desktop (≥ 992 px) | 6 (`col-lg-4`) | 126 px |

### Estructura de la tabla en Drive

El autor escribe una tabla **Card Categories** en el documento de Drive. Todas las filas son
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
    - **Descripción:** Servicio de donde llegan las categorías
    - **Por defecto:** sin fila, se usan las 6 categorías del JSON interno del bloque
      (`FALLBACK_CATEGORIES`)

5. **`Alert Duration`**
    - **Tipo:** Número (segundos)
    - **Descripción:** Cuánto dura la alerta de error; `0` la deja hasta que el usuario la cierra
    - **Por defecto:** `5`

6. **`Alert Color`**
    - **Tipo:** Select
    - **Opciones:**
        - `error` – Rojo
        - `warning` – Ámbar
        - `success` – Verde
        - `info` – Azul
        - un color hex (por ejemplo `#1a4fd8`) – Fondo personalizado
    - **Descripción:** Color de la alerta de error
    - **Por defecto:** `error`

7. **`Error Response Message`**
    - **Tipo:** Texto
    - **Descripción:** Texto de la alerta cuando el servicio falla o no responde
    - **Por defecto:** `errorResponseMessage` de `scripts/foundations/messages.js` (también si la fila
      está vacía)

8. **`Empty List Title`**
    - **Tipo:** Texto
    - **Descripción:** Título del aviso cuando no hay categorías que mostrar
    - **Por defecto:** `emptyListTitle` de `scripts/foundations/messages.js`. Si la fila existe pero
      está vacía, no se pinta

9. **`Empty List Description`**
    - **Tipo:** Texto
    - **Descripción:** Descripción de ese aviso
    - **Por defecto:** `emptyListDescription` de `scripts/foundations/messages.js`. Si la fila existe
      pero está vacía, no se pinta

10. **`Empty List Icon`**
    - **Tipo:** Texto (emoji o texto corto)
    - **Descripción:** Icono de ese aviso
    - **Por defecto:** `🗂️` (`EMPTY_LIST_ICON` en `card-categories.js`). Si la fila existe pero está
      vacía, no se pinta

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- El **título** de la sección
- El **servicio** de donde llegan las categorías
- La **duración**, el **color** y el **texto** de la alerta de error
- El **título**, la **descripción** y el **icono** del aviso de lista vacía
- **Estilos** y **clases** extra del bloque

![Vista Tabla en Drive](/documentation/readme/card-categories/drive-table.png)

### Propiedades del JSON

Cada categoría que llega del servicio (o del JSON interno) dentro de
`{ data: { categories: [ … ] } }`:

1. `id` – Identificador; evita categorías repetidas
2. `label` – Nombre que se muestra (obligatorio: sin nombre la categoría no se pinta)
3. `icon` – Emoji o texto corto del icono
4. `path` – Enlace de la tarjeta (obligatorio: sin enlace válido la categoría no se pinta)
5. `color` – Color hex del hover (`#1a4fd8`); si no es válido usa el color por defecto
6. `active` – `false` oculta la categoría
7. `order` – Posición en la lista (de menor a mayor)

```json
{
  "data": {
    "categories": [
      { "id": "CAT-001", "label": "Celulares", "icon": "📱", "path": "/celulares", "color": "#1a4fd8", "active": true, "order": 1 }
    ]
  }
}
```

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Sin `Endpoint` y el JSON interno tiene categorías | Las tarjetas del JSON interno |
| Sin `Endpoint` y el JSON interno está vacío o sin datos | Aviso de lista vacía, sin alerta |
| El servicio está respondiendo | Esqueleto de carga (6 tarjetas grises) |
| El servicio responde la lista vacía (o sin categorías activas) | Aviso de lista vacía, sin alerta |
| El servicio falla, no responde o la respuesta no trae la lista | Alerta (`Error Response Message`) + aviso de lista vacía |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/card-categories/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/card-categories/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/card-categories/component-mobile.png)

### Archivos y dependencias

- `card-categories.js` – Construye el bloque, lee la tabla y llama al servicio
- `card-categories.css` – Estilos del bloque (tamaños, colores y estados; las columnas vienen del grid)
- `scripts/foundations/` – `block-options.js`, `block-utils.js`, `messages.js` y `toast.js`
- `scripts/api/http-client.js` – Llamada al servicio
- `blocks/empty-list-message/` – Aviso de lista vacía compartido
- `styles/foundations/grid.css` – Columnas y espacio entre tarjetas
- Colores en `styles/colors.css` (`--card-categories-*`)

Integración del servicio: `documentation/02-integracion-endpoints.md`.
