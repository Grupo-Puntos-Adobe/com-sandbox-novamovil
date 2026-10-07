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
lista.

### Características

- Un solo aviso con el mismo diseño para todos los bloques que lo usan
- Solo pinta lo que le mandan: icono, título y descripción
- Cada parte es opcional: si llega vacía, no se pinta
- Trae su propio CSS (`empty-list-message.css`), que se pide en cuanto un bloque lo importa, así ya
  está listo cuando se pinta el aviso
- No tiene textos por defecto: los pone el bloque que lo llama
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

1. `icon` – Emoji o texto corto
2. `title` – Título
3. `description` – Descripción

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
| Llegan icono, título y descripción | El aviso completo |
| Una parte llega vacía | Esa parte no se pinta |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/empty-list-message/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/empty-list-message/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/empty-list-message/component-mobile.png)

### Archivos y dependencias

- `empty-list-message.js` – `buildEmptyListMessage({ icon, title, description })`; pide su CSS al
  importarse
- `empty-list-message.css` – Estilos del aviso (tamaños, colores y resoluciones)
- `scripts/aem.js` – `loadCSS` para pedir el CSS
- `styles/foundations/breakpoints.css` – Resoluciones (mobile, tablet y desktop)
- Colores en `styles/colors.css` (`--empty-list-message-*`)
- Lo usan: `blocks/card-categories/`, `blocks/card-featured/` y `blocks/card-promotions/`
