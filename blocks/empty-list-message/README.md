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

<div class="empty-list-message"></div>

## Componente Empty List Message

Este componente permite a los usuarios **ver un aviso con icono, título y descripción cuando una
lista no tiene nada que mostrar**.
Es el aviso compartido de las tres tarjetas (`card-categories`, `card-featured` y `card-promotions`):
cada una lo llama cuando su lista está vacía o su servicio falla y le manda los textos. El autor no lo
escribe como tabla propia en Drive; sus textos salen de las filas `Empty List …` de la tabla de cada
tarjeta.

### Características

- Un solo aviso con el mismo diseño para las tres tarjetas
- Solo pinta lo que le manda la tarjeta: icono, título y descripción
- Cada parte es opcional: si la tarjeta la manda vacía, no se pinta
- Trae su propio CSS (`empty-list-message.css`), que se pide en cuanto una tarjeta importa el bloque,
  así ya está listo cuando se pinta el aviso
- No tiene textos por defecto: los defaults viven en la tarjeta (`scripts/foundations/messages.js` y
  el `EMPTY_LIST_ICON` de cada bloque)
- La alerta flotante de error no está aquí: la muestra la tarjeta
- Adaptación a móvil, tablet y desktop (`styles/foundations/breakpoints.css`)
- Accesible: `role="status"` para que los lectores de pantalla lo anuncien y el icono decorativo
  oculto (`aria-hidden="true"`)
- Pintado seguro: los textos se ponen siempre como texto (nunca HTML)

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`empty-list-message-*`).
Todo se construye con `div`.

- `empty-list-message` – Contenedor del aviso (`role="status"`), borde punteado y fondo blanco
- `empty-list-message-icon` – Icono (emoji o texto corto, decorativo, `aria-hidden="true"`)
- `empty-list-message-title` – Título del aviso
- `empty-list-message-description` – Descripción del aviso

```text
div.card-*                                   (la tarjeta que lo llama)
├─ div.card-*-header                         (título de la tarjeta, si tiene)
└─ div.empty-list-message[role=status]
   ├─ div.empty-list-message-icon[aria-hidden=true]
   ├─ div.empty-list-message-title
   └─ div.empty-list-message-description
```

### Resoluciones

| Resolución | Espacio interior (arriba/abajo · lados) | Icono | Título | Descripción |
|---|---|---|---|---|
| mobile (< 768 px) | 32 px · 20 px | 32 px | 16 px | 14 px |
| tablet (768–991 px) | 40 px · 24 px | 32 px | 16 px | 14 px |
| desktop (≥ 992 px) | 40 px · 24 px | 32 px | 16 px | 14 px |

### Estructura de la tabla en Drive

El aviso **no tiene tabla propia**. Se configura con estas filas de la tabla de cada tarjeta
(**Card Categories**, **Card Featured** o **Card Promotions**); todas son opcionales:

1. **`Empty List Title`**
    - **Tipo:** Texto
    - **Descripción:** Título del aviso
    - **Por defecto:** `emptyListTitle` de `scripts/foundations/messages.js`. Si la fila existe pero
      está vacía, no se pinta

2. **`Empty List Description`**
    - **Tipo:** Texto
    - **Descripción:** Descripción del aviso
    - **Por defecto:** `emptyListDescription` de `scripts/foundations/messages.js`. Si la fila existe
      pero está vacía, no se pinta

3. **`Empty List Icon`**
    - **Tipo:** Texto (emoji o texto corto)
    - **Descripción:** Icono del aviso
    - **Por defecto:** el `EMPTY_LIST_ICON` de cada tarjeta. Si la fila existe pero está vacía, no se
      pinta

| Tarjeta | Icono por defecto |
|---|---|
| Card Categories | `🗂️` |
| Card Featured | `📦` |
| Card Promotions | `🏷️` |

### Vista previa de la tabla en Drive

Las filas del aviso dentro de la tabla de una tarjeta (en amarillo) permiten al autor configurar:

- El **título** del aviso
- La **descripción** del aviso
- El **icono** del aviso

![Vista Tabla en Drive](/documentation/readme/empty-list-message/drive-table.png)

### Parámetros de la función

La tarjeta importa el bloque y llama a `buildEmptyListMessage` con un objeto:

1. `icon` – Emoji o texto corto (`Empty List Icon`)
2. `title` – Título (`Empty List Title`)
3. `description` – Descripción (`Empty List Description`)

Devuelve el `div.empty-list-message` listo para ponerlo en el bloque.

```js
import { buildEmptyListMessage } from '../empty-list-message/empty-list-message.js';

block.replaceChildren(header, buildEmptyListMessage({
  icon: '🗂️',
  title: 'Por ahora no hay categorías disponibles',
  description: 'Vuelve pronto para descubrir nuestras novedades.',
}));
```

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Sin `Endpoint` y el JSON interno de la tarjeta está vacío o sin datos | El aviso, sin alerta |
| El servicio responde la lista vacía (o sin elementos activos) | El aviso, sin alerta |
| El servicio falla, no responde o la respuesta no trae la lista | Alerta de error (la muestra la tarjeta) + el aviso |
| La fila `Empty List …` no existe | Esa parte sale con su texto o icono por defecto |
| La fila `Empty List …` existe pero está vacía | Esa parte no se pinta |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/empty-list-message/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/empty-list-message/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/empty-list-message/component-mobile.png)

En Card Featured:

![Vista Componente en Card Featured](/documentation/readme/empty-list-message/component-card-featured.png)

En Card Promotions:

![Vista Componente en Card Promotions](/documentation/readme/empty-list-message/component-card-promotions.png)

### Archivos y dependencias

- `empty-list-message.js` – `buildEmptyListMessage({ icon, title, description })`; pide su CSS al
  importarse
- `empty-list-message.css` – Estilos del aviso (tamaños, colores y resoluciones)
- `scripts/aem.js` – `loadCSS` para pedir el CSS
- `styles/foundations/breakpoints.css` – Resoluciones (mobile, tablet y desktop)
- Colores en `styles/colors.css` (`--empty-list-message-*`)
- Lo usan: `blocks/card-categories/`, `blocks/card-featured/` y `blocks/card-promotions/` (es una de
  las dos importaciones entre bloques permitidas, junto con `fragment`)
