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

<div class="block-session-example"></div>

## Componente Block Session Example

Este componente es un **ejemplo de todo lo que se puede armar con sesiones**: mostrar u ocultar un
bloque completo, filas sueltas o botones según quién visita, pintar datos del usuario y hacer una
llamada privada con su token.
Es solo de muestra (página `/ejemplo-sesion`, pública): los bloques del sitio siguen públicos y no
cambian. Sirve para copiar la forma de hacerlo en un bloque nuevo.

Lo de sesiones **no** está en este bloque: viene de `scripts/foundations/block-options.js` (filas
`Session` y estados en la última columna, igual en cualquier bloque NovaMóvil) y de
`scripts/foundations/session.js` (estado, `renderForSession`, `setSessionVisibility`). Este bloque
solo lo pone en práctica.

### Características

- **Bloque completo por sesión:** la fila `Session` (cualquier bloque la acepta): `true` = solo con
  sesión, `false` = solo sin sesión, sin la fila = siempre. Nunca redirige
- **Panel de estado:** etiqueta del estado (verde con sesión, azul invitado, gris sin sesión) y un
  texto por estado; con sesión saluda con el nombre (`{name}`)
- **Filas por sesión, igual que en cualquier bloque NovaMóvil:** el estado va en la **última
  columna** (`Item | texto | signed-in`), tenga la fila 2 o más columnas; las filas de otros estados
  se quitan antes de pintar y la página se recarga al cambiar la sesión
- **Botones por sesión:** "Iniciar sesión" y "Continuar como invitado" solo sin sesión; "Cerrar
  sesión" con sesión o como invitado
- **Llamada privada:** con `Private Endpoint` y sesión, llama con el token (Bearer) y muestra la
  respuesta
- El estado, la etiqueta y los botones cambian al instante; las filas por sesión, al recargar (sola)
- Grid de 24 columnas: 1 tarjeta por fila en móvil, 2 en tablet y 3 en desktop
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Accesible: el estado se anuncia al cambiar (`aria-live="polite"`) y el título es un encabezado de
  nivel 2

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases
(`block-session-example-*`) y todos sus estilos van dentro de `.block-session-example`. Se
construye con `div`, excepto los enlaces (`a`) y los botones (`button`). Mostrar u ocultar por
sesión **no** está en su CSS: lo hacen las clases `session-only-*` de
`styles/foundations/sessions.css`.

- `block-session-example` – Contenedor principal del componente (el bloque)
- `block-session-example-title` – Título (`role="heading"`, `aria-level="2"`)
- `block-session-example-status` – Panel de estado
- `block-session-example-status-title` – Título del panel ("Tu estado")
- `block-session-example-status-current` – Lo que cambia con la sesión (`aria-live="polite"`)
- `block-session-example-badge` – Etiqueta del estado; `-badge-signed-in`, `-badge-guest`,
  `-badge-signed-out`
- `block-session-example-status-text` – Texto del estado
- `block-session-example-actions` – Botones
- `block-session-example-button` – Botón (y `-button-primary` para "Iniciar sesión")
- `block-session-example-item` – Tarjeta de cada `Item`
- `block-session-example-item-tag` – Quién la ve ("Lo ve: Con sesión")
- `block-session-example-item-text` – Texto de la tarjeta
- `block-session-example-private` – Llamada privada (`-private-title`, `-private-text`)
- `session-only session-only-*` – Clases de `sessions.css`: las pone el JS en los botones y la
  llamada privada, y `block-options.js` en el wrapper cuando la tabla tiene la fila `Session`

```text
div.block-session-example-wrapper            (fila Session: true → .session-only-signed-in;
│                                              false → .session-only-signed-out.session-only-guest)
└─ div.block-session-example
   └─ div.container-fluid
      └─ div.row.row-gutter-16.row-gutter-y-16
         ├─ div.col-24 > div.block-session-example-title[role=heading]
         ├─ div.col-24 > div.block-session-example-status
         │  ├─ div.block-session-example-status-title
         │  ├─ div.block-session-example-status-current[aria-live]   (renderForSession)
         │  │  └─ div.-status-body > div.-badge.-badge-{estado} + div.-status-text
         │  └─ div.block-session-example-actions
         │     ├─ a.-button.-button-primary.session-only.session-only-signed-out
         │     ├─ button.-button.session-only.session-only-signed-out
         │     └─ button.-button.session-only.session-only-signed-in.session-only-guest
         ├─ div.col-24.col-md-12.col-lg-8 > div.block-session-example-item × N   (filas que quedan)
         │  ├─ div.block-session-example-item-tag
         │  └─ div.block-session-example-item-text
         └─ div.col-24.session-only.session-only-signed-in > div.block-session-example-private
```

### Resoluciones

| Resolución | Tarjetas por fila | Panel de estado | Botones |
|---|---|---|---|
| mobile (< 768 px) | 1 | En columna, padding 20 px | Uno debajo de otro |
| tablet (768–991 px) | 2 | En fila, padding 24 px | En fila |
| desktop (≥ 992 px) | 3 | En fila, padding 24 px, título de 26 px | En fila |

### Estructura de la tabla en Drive

El autor escribe una tabla **Block Session Example**. Todas las filas son opcionales; las de
contenido no tienen texto por defecto: sin texto, esa parte no se pinta.

1. **`Styles`** / **`Classname`**
    - **Tipo:** Texto
    - **Descripción:** Estilos en línea y clases extra (ver `documentation/06-styles-classname.md`)
    - **Por defecto:** ninguno

2. **`Session`**
    - **Tipo:** `true` / `false`
    - **Descripción:** El bloque **completo**: `true` solo se ve con sesión; `false` solo sin sesión
      (se oculta al iniciar sesión). El invitado cuenta como "sin sesión". No redirige
    - **Por defecto:** vacía o sin la fila, se ve siempre

3. **`Title`** / **`Status Title`**
    - **Tipo:** Texto
    - **Descripción:** Título del bloque y del panel de estado

4. **`Signed In Text`** / **`Guest Text`** / **`Signed Out Text`**
    - **Tipo:** Texto
    - **Descripción:** Texto del panel en cada estado. `{name}` es el nombre del usuario
      (`firstName`, o su correo)
    - **Por defecto:** ninguno. Sin `Guest Text`, el invitado ve solo su etiqueta

5. **`Item`** (las que quieras)
    - **Tipo:** `Item` | texto | estado (opcional, en la **última columna**)
    - **Descripción:** Una tarjeta. Estado: `signed-in`, `guest`, `signed-out` o combinados
      (`signed-in, guest`); sin estado (o vacía) la ven todos. Es la regla general: **cualquier
      fila de cualquier bloque NovaMóvil** puede terminar con un estado, sin importar cuántas
      columnas tenga; si la celda trae otro texto además del estado, no cuenta
    - **Por defecto:** ninguna

6. **`Login Link`**
    - **Tipo:** Enlace (texto y link)
    - **Descripción:** Botón "Iniciar sesión" (solo sin sesión); va a su enlace tal cual, sin nada en
      la URL

7. **`Guest Button Text`** / **`Sign Out Text`**
    - **Tipo:** Texto
    - **Descripción:** Botón de invitado (solo sin sesión) y de cerrar sesión (con sesión o invitado)

8. **`Private Title`** / **`Private Endpoint`**
    - **Tipo:** Texto / URL (también se acepta `PrivateEndpoint`). Es la regla del proyecto: un
      servicio que necesita sesión va en `Private Endpoint`; `Endpoint` es para los públicos
    - **Descripción:** Llamada privada: con sesión hace `post(Private Endpoint)` con
      `REQUEST_TYPE.PRIVATE` (Bearer en el header y en `security.auth.value`) y muestra
      `status.message` de la respuesta
    - **Por defecto:** sin `Private Endpoint`, no se pinta

### La página de ejemplo (`ejemplo-sesion`)

`content-drive/ejemplo-sesion.docx` es una página **pública** (sin `Session` en su Metadata) con 3
tablas **Block Session Example**:

| # | Fila `Session` | Qué demuestra |
|---|---|---|
| 1 | vacía | El bloque completo: estado, tarjetas por estado, botones y llamada privada. Se ve siempre |
| 2 | `true` | "Solo con sesión": el bloque entero se oculta sin sesión (y como invitado) |
| 3 | `false` | "Solo sin sesión": el bloque entero se oculta al iniciar sesión; el invitado lo sigue viendo |

La regla de la **página** (Metadata `Session` / `Redirect To`) no se usa aquí: se ve en `login`,
`cuenta` y `perfil` (ver `documentation/08-sesiones.md`).

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- **Quién ve** el bloque completo (`Session`) y cada tarjeta (`Item`)
- Los **textos** de cada estado y los **botones**
- La **llamada privada** (`Private Endpoint`)

![Vista Tabla en Drive](/documentation/readme/block-session-example/drive-table.png)

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Sin sesión | Etiqueta "Sin sesión", tarjetas `signed-out` y para todos, botones "Iniciar sesión" y "Continuar como invitado" |
| Clic en "Continuar como invitado" | La página se recarga: etiqueta "Invitado", tarjetas `guest` y `signed-in, guest`, botón "Cerrar sesión" |
| Con sesión | "Hola, Cliente…", tarjetas `signed-in` y `signed-in, guest`, botón "Cerrar sesión" y llamada privada |
| Clic en "Cerrar sesión" | La página se recarga y vuelve a "Sin sesión" |
| Fila `Session` = `true` | El bloque entero solo se ve con sesión (la página no redirige) |
| Fila `Session` = `false` | El bloque entero se oculta al iniciar sesión (el invitado lo sigue viendo) |
| Fila `Session` = `true` / `false` y se inicia o cierra sesión | El bloque aparece o desaparece al instante, sin recargar |
| `Item` con `guest y otra palabra` en la última columna | No cuenta como estado: la tarjeta se ve siempre |
| Panel de edición | Se ve todo, para poder editarlo |

### Vista previa

Desktop (con sesión):

![Vista Componente desktop](/documentation/readme/block-session-example/component-desktop.png)

Desktop (sin sesión):

![Vista Componente sin sesión](/documentation/readme/block-session-example/component-signed-out.png)

Tablet:

![Vista Componente tablet](/documentation/readme/block-session-example/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/block-session-example/component-mobile.png)

### Cómo hacerlo en tu bloque (copiar y pegar)

```js
import {
  SESSION_STATES, renderForSession, setSessionVisibility, signOut,
} from '../../scripts/foundations/session.js';
import { post, REQUEST_TYPE } from '../../scripts/api/http-client.js';

// 0) en Drive, sin código (cualquier bloque que llame applyBlockOptions):
//    | Session | true |                          ← el bloque entero solo con sesión
//    | Title   | Tus promociones | signed-in |   ← esta fila solo con sesión (última columna)

// 1) algo que solo ve quien tiene sesión (sessions.css lo oculta a los demás)
setSessionVisibility(couponCard, 'signed-in');

// 2) datos del usuario que se vuelven a pintar al cambiar la sesión
renderForSession(greeting, {
  [SESSION_STATES.SIGNED_IN]: (session) => `Hola, ${session.user.firstName}`,
  [SESSION_STATES.SIGNED_OUT]: () => 'Inicia sesión para ver tus cupones',
});

// 3) una llamada privada (manda el Bearer)
post(endpoint, body, { interceptor: REQUEST_TYPE.PRIVATE });
```

### Archivos y dependencias

- `block-session-example.js` – Lee la tabla y arma el estado, las tarjetas y los botones
- `block-session-example.css` – Estilos del bloque, todos dentro de `.block-session-example`
- `scripts/foundations/session.js` – Estado, `renderForSession`, `setSessionVisibility`,
  `continueAsGuest`, `signOut`
- `styles/foundations/sessions.css` – Clases `session-only-*` que muestran u ocultan (lo carga
  `block-options.js`)
- `scripts/foundations/block-options.js` – Filas `Styles`, `Classname` y `Session`, filas por sesión
  (última columna) y arranque de las sesiones (`sessions.css` + regla de la página)
- `scripts/api/http-client.js` – `post` con `REQUEST_TYPE.PRIVATE`
- `scripts/foundations/block-utils.js` – `readPrivateEndpoint` para la fila `Private Endpoint`
- `styles/foundations/grid.css` y `breakpoints.css` – Columnas y resoluciones
- Colores en `styles/colors.css` (`--block-session-example-*`)
- Documento de Drive: `content-drive/ejemplo-sesion.docx` (3 bloques: completo, `Session` `true` y
  `Session` `false`)
- Guías: `documentation/08-sesiones.md` (sesiones) y `documentation/06-styles-classname.md`
  (`block-options`)
