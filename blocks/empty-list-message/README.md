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
Es un bloque compartido: otro bloque lo importa, le manda los textos y pone el aviso donde iría su
lista. **No tiene tabla propia en Drive**: sus textos vienen de las filas `Empty List …` del bloque
que lo usa. Junto con `fragment` es la única importación permitida entre bloques (`AGENTS.md`).

### Características

- Un solo aviso con el mismo diseño para todos los bloques que lo usan
- Pinta lo que le mandan: icono, título y descripción
- Solo si una parte llega vacía (no viene, `''` o solo espacios) usa su valor genérico:
  - Título y descripción: mensajes genéricos de `scripts/foundations/messages.js`
    (`emptyListTitle` y `emptyListDescription`)
  - Icono: `📭` (`EMPTY_LIST_ICON`, dentro del bloque)
- Siempre pinta las 3 partes (lo que le mandan o el genérico)
- Trae su propio CSS (`empty-list-message.css`), que se pide en cuanto un bloque lo importa, así ya
  está listo cuando se pinta el aviso
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
div.empty-list-message[role=status]
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

### Parámetros de la función

El bloque que lo usa lo importa y llama a `buildEmptyListMessage` con un objeto:

1. `icon` – Emoji o texto corto. Si llega vacío: `📭`
2. `title` – Título. Si llega vacío: `Por ahora no hay elementos disponibles`
3. `description` – Descripción. Si llega vacía: `Vuelve pronto para descubrir nuestras novedades.`

Devuelve el `div.empty-list-message` listo para ponerlo en el bloque.

```js
import { buildEmptyListMessage } from '../empty-list-message/empty-list-message.js';

block.replaceChildren(header, buildEmptyListMessage({
  icon: '🗂️',
  title: 'Por ahora no hay categorías disponibles',
  description: 'Vuelve pronto para descubrir nuestras novedades.',
}));
```

### Cómo lo configura el autor (en la tabla del bloque que lo usa)

| Fila del bloque que lo usa | Parte del aviso | Sin la fila | Fila vacía |
|---|---|---|---|
| `Empty List Title` | Título | Texto por defecto de `messages.js` | Genérico del aviso (el mismo de `messages.js`) |
| `Empty List Description` | Descripción | Texto por defecto de `messages.js` | Genérico del aviso |
| `Empty List Icon` | Icono | Icono propio del bloque (abajo) | `📭` |

| Bloque | Cuándo lo muestra | Icono por defecto |
|---|---|---|
| `card-categories` | Lista vacía o servicio con error | `🗂️` |
| `card-featured` | Lista vacía o servicio con error | `📦` |
| `card-promotions` | Lista vacía o servicio con error | `🏷️` |
| `product-catalog` | Búsqueda sin resultados o servicio con error | `📱` |
| `product-detail` | Celular que no existe, id inválido o servicio con error | `📱` |

**Por sesión:** como esas filas están en la tabla del bloque que lo usa (que pasa por
`block-options.js`), pueden llevar el estado en la **última columna** para cambiar el aviso según
quién visita. Por ejemplo, en `card-promotions`:

| Card Promotions | | |
|---|---|---|
| Empty List Title | Inicia sesión para ver tus promociones | signed-out |
| Empty List Title | Por ahora no hay promociones para ti | signed-in |

El aviso no sabe nada de sesiones: solo pinta lo que le llega. Ver `documentation/08-sesiones.md`.

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Llegan icono, título y descripción | El aviso con lo que llegó |
| Llega vacío el icono | El icono genérico `📭` |
| Llega vacío el título | `Por ahora no hay elementos disponibles` (`messages.js`) |
| Llega vacía la descripción | `Vuelve pronto para descubrir nuestras novedades.` (`messages.js`) |
| Llegan vacíos los 3 | `📭` y los dos mensajes genéricos |

### Cómo probarlo

1. **Con texto en sus filas:** en `card-categories`, poner un `Endpoint` que no exista: sale la
   alerta y el aviso con 🗂️ y los textos de `Empty List Title` / `Empty List Description`.
2. **Sin las filas `Empty List …`:** el aviso usa los textos por defecto de `messages.js` y el icono
   del bloque.
3. **Con las filas vacías:** el aviso usa los genéricos ("Por ahora no hay elementos disponibles",
   📭).
4. **En el detalle:** `/celulares/?id=NO_VALIDO!` muestra "Este celular no existe" con 📱.
5. **Por sesión:** con dos filas `Empty List Title` (`signed-out` / `signed-in`) el texto del aviso
   cambia al iniciar sesión.

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/empty-list-message/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/empty-list-message/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/empty-list-message/component-mobile.png)

### Archivos y dependencias

- `empty-list-message.js` – `buildEmptyListMessage({ icon, title, description })`; pide su CSS al
  importarse y tiene el icono genérico (`EMPTY_LIST_ICON`)
- `scripts/foundations/messages.js` – Mensajes genéricos (`emptyListTitle`, `emptyListDescription`)
- `empty-list-message.css` – Estilos del aviso (tamaños, colores y resoluciones)
- `scripts/aem.js` – `loadCSS` para pedir el CSS
- `styles/foundations/breakpoints.css` – Resoluciones (mobile, tablet y desktop)
- Colores en `styles/colors.css` (`--empty-list-message-*`)
- Lo usan: `blocks/card-categories/`, `blocks/card-featured/`, `blocks/card-promotions/`,
  `blocks/product-catalog/` y `blocks/product-detail/` (cada uno lee sus filas `Empty List …`; las
  filas por sesión las resuelve su `block-options.js` antes)
- Guías: `documentation/08-sesiones.md` (filas por sesión) y `documentation/07-integracion-endpoints.md`
  (cuándo lo muestran las tarjetas)
