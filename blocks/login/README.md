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

<div class="login"></div>

## Componente Login

Este componente permite a los usuarios **identificarse para continuar con su compra**: iniciar
sesión con su correo o teléfono y contraseña, o continuar como invitado.
Vive en la página **login** (`/login`) y tiene dos tabs, **Iniciar sesión** y **Crear cuenta**; se
muestra uno u otro.

> **Estado actual:** conectado al servicio de inicio de sesión (mock de Postman). Por ahora
> **siempre se envían los mismos datos** (`cliente@ejemplo.com` / `Password123`), escriba lo que
> escriba el usuario; ya está preparado para enviar lo del formulario (ver
> [Datos que se envían](#datos-que-se-envían)). El tab **Crear cuenta** está vacío: su bloque se
> hace después.

### Características

- Título y descripción de la página
- Tabs **Iniciar sesión** / **Crear cuenta**: se muestra un panel a la vez
- Formulario con usuario (correo o teléfono) y contraseña, con autocompletado del navegador y de
  los gestores de contraseñas
- Enlace **¿Olvidaste tu contraseña?**, botón **Iniciar sesión**, separador "o" y botón
  **Continuar como invitado**
- Texto legal con enlaces a **Términos y Condiciones** y **Aviso de Privacidad**
- Todo se configura desde la tabla en Drive; si una fila no tiene texto, esa parte no se pinta
- Inicio de sesión con el servicio de la fila `Endpoint` (POST): al responder 200 guarda la sesión
  (`scripts/foundations/session.js`) y lleva a la siguiente página
- Mensajes del servicio: arriba del formulario (error o éxito) y debajo de cada campo (400)
- Mientras espera la respuesta, el botón se desactiva para no enviar dos veces
- Columna centrada con el grid (`container-fluid > row row-center > col-24`): todo el ancho en
  móvil y 420 px desde tablet
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Accesible: tabs con `role="tablist"` / `tab` / `tabpanel` (flechas, Inicio y Fin para cambiar
  de tab), cada campo con su `label`, título como encabezado de nivel 1 y foco visible
- Pintado seguro: los textos se ponen siempre como texto (nunca HTML) y solo acepta enlaces del
  mismo sitio o `http(s)`

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`login-*`) y todos sus
estilos van dentro de `.login`. Se construye con `div` y roles ARIA, excepto lo que necesita un
formulario para funcionar (`form`, `label`, `input`, `button`) y los enlaces (`a`).

- `login` – Contenedor principal del componente (el bloque)
- `login-frame` – Columna centrada del grid (`col-24`)
- `login-header` – Título y descripción
- `login-title` – Título (`role="heading"`, `aria-level="1"`)
- `login-description` – Descripción
- `login-tabs` – Tabs (`role="tablist"`)
- `login-tab` – Cada tab (`button`, `role="tab"`, `aria-selected`)
- `login-panel` – Panel de cada tab (`role="tabpanel"`); `login-panel-login` y
  `login-panel-register` (vacío por ahora)
- `login-form` – Tarjeta blanca con el formulario (`form`, `aria-busy` mientras espera)
- `login-alert` – Mensaje del servicio arriba del formulario (`role="alert"`); `login-alert-error`
  o `login-alert-success`
- `login-field` – Etiqueta y campo
- `login-label` – Etiqueta del campo (`label`)
- `login-input` – Campo (`input`): usuario (`name="emailOrPhone"`, `autocomplete="username"`) y
  contraseña (`name="password"`, `autocomplete="current-password"`); con error lleva
  `aria-invalid="true"` y `aria-describedby` hacia su mensaje
- `login-field-error` – Mensaje de error debajo del campo (solo cuando el servicio lo manda)
- `login-forgot` / `login-forgot-link` – Enlace "¿Olvidaste tu contraseña?"
- `login-submit` – Botón "Iniciar sesión" (`button type="submit"`, `disabled` mientras espera)
- `login-divider` / `login-divider-text` – Separador con la "o" (`role="separator"`)
- `login-guest` – Botón "Continuar como invitado" (`a` con enlace, o `button` sin enlace)
- `login-legal` / `login-legal-link` – Texto legal y sus enlaces

```text
div.login
└─ div.container-fluid
   └─ div.row.row-center
      └─ div.col-24.login-frame
         ├─ div.login-header
         │  ├─ div.login-title[role=heading][aria-level=1]
         │  └─ div.login-description
         ├─ div.login-tabs[role=tablist]
         │  ├─ button.login-tab[role=tab][aria-selected=true]    Iniciar sesión
         │  └─ button.login-tab[role=tab][aria-selected=false]   Crear cuenta
         ├─ div.login-panel.login-panel-login[role=tabpanel]
         │  └─ form.login-form[aria-busy]
         │     ├─ div.login-alert[role=alert][hidden]                      (mensaje del servicio)
         │     ├─ div.login-field × 2
         │     │  ├─ label.login-label
         │     │  ├─ input.login-input[aria-invalid][aria-describedby]
         │     │  └─ div.login-field-error                                 (solo con error)
         │     ├─ div.login-forgot > a.login-forgot-link
         │     ├─ button.login-submit[type=submit]
         │     ├─ div.login-divider[role=separator] > div.login-divider-text
         │     └─ a.login-guest
         ├─ div.login-panel.login-panel-register[role=tabpanel][hidden]   (vacío)
         └─ div.login-legal > a.login-legal-link × N
```

### Resoluciones

| Resolución | Columna | Espacio arriba/abajo | Título | Tarjeta |
|---|---|---|---|---|
| mobile (< 768 px) | Todo el ancho | 24 px · 32 px | 28 px | Padding 24 px, radio 18 px |
| tablet (768–991 px) | 420 px centrada | 56 px | 28 px | Padding 24 px, radio 18 px |
| desktop (≥ 992 px) | 420 px centrada | 56 px | 28 px | Padding 24 px, radio 18 px |

Campos de 44 px de alto, botón **Iniciar sesión** de 48 px y **Continuar como invitado** de 46 px
en todas las resoluciones.

### Estructura de la tabla en Drive

El autor escribe una tabla **Login** en el documento `login` de Drive. Todas las filas son
opcionales y pueden ir en cualquier orden. Solo `Error Response Message` tiene valor por defecto
(mensaje); las demás son contenido o configuración: si la fila no existe o está vacía, esa parte no
se pinta (en `Redirect With Session`, vacía = modo paso).

1. **`Styles`**
    - **Tipo:** Texto (declaraciones CSS separadas por `;`)
    - **Descripción:** Estilos en línea sobre el bloque
    - **Por defecto:** ninguno (ver `documentation/06-styles-classname.md`)

2. **`Classname`**
    - **Tipo:** Texto (nombres separados por espacio o coma)
    - **Descripción:** Clases extra sobre el bloque
    - **Por defecto:** ninguna

    También acepta la fila **`Session`** de cualquier bloque (ver `documentation/08-sesiones.md`);
    en modo paso el login ya se pone solo `signed-out`.

3. **`Title`**
    - **Tipo:** Texto
    - **Descripción:** Título de la página ("Identifica tu cuenta")
    - **Por defecto:** ninguno

4. **`Description`**
    - **Tipo:** Texto
    - **Descripción:** Texto debajo del título
    - **Por defecto:** ninguno

5. **`Login Tab`** / **`Register Tab`**
    - **Tipo:** Texto
    - **Descripción:** Texto de cada tab ("Iniciar sesión" / "Crear cuenta")
    - **Por defecto:** ninguno. Los tabs solo salen si las dos filas tienen texto; si no, solo se ve
      el formulario de inicio de sesión

6. **`Endpoint`**
    - **Tipo:** URL
    - **Descripción:** Servicio de inicio de sesión (POST),
      `https://cca7ebd1-f76f-47d0-a949-b4b8618f05e5.mock.pstmn.io/api/v1/auth/login`
    - **Por defecto:** ninguno. Sin `Endpoint`, el botón no envía nada

7. **`Redirect With Session`**
    - **Tipo:** Ruta del sitio (`/perfil`)
    - **Descripción:** **Con ruta:** siempre que haya sesión va ahí, sin mostrar el formulario (al
      abrir la página ya con sesión o justo después de iniciar sesión). **Vacía o sin la fila: modo
      paso**: no redirige; el login solo se ve sin sesión y, al iniciar sesión o entrar como
      invitado, se oculta solo y el paso queda cumplido (para los pasos de compra). No se lee ni se
      agrega nada en la URL
    - **Por defecto:** ninguno (modo paso)
    - El `nextStep.route` del servicio ya no decide a dónde ir: lo decide la tabla

8. **`User Label`** / **`User Placeholder`**
    - **Tipo:** Texto
    - **Descripción:** Etiqueta y texto de ejemplo del campo de usuario ("Correo electrónico o
      teléfono" / "correo@ejemplo.com")
    - **Por defecto:** ninguno. Sin etiqueta, el campo conserva su nombre para lectores de pantalla
      (`LABELS` en `login.js`)

9. **`Password Label`** / **`Password Placeholder`**
    - **Tipo:** Texto
    - **Descripción:** Etiqueta y texto de ejemplo del campo de contraseña
    - **Por defecto:** ninguno (igual que el usuario)

10. **`Forgot Password`**
    - **Tipo:** Enlace (texto y link en la celda)
    - **Descripción:** "¿Olvidaste tu contraseña?"
    - **Por defecto:** ninguno. Sin texto o sin enlace válido, no se pinta

11. **`Button Text`**
    - **Tipo:** Texto
    - **Descripción:** Botón "Iniciar sesión"
    - **Por defecto:** ninguno

12. **`Divider Text`**
    - **Tipo:** Texto
    - **Descripción:** Texto del separador ("o")
    - **Por defecto:** ninguno. El separador solo sale entre el botón y **Guest Button**; sin texto
      queda solo la línea

13. **`Guest Button`**
    - **Tipo:** Texto, con enlace opcional
    - **Descripción:** "Continuar como invitado": activa el modo invitado (`continueAsGuest()`) y
      luego va a su enlace. Sin enlace se queda (modo paso: el paso queda cumplido) y se pinta como
      botón
    - **Por defecto:** ninguno. Sin texto, no se pinta

14. **`Legal Text`**
    - **Tipo:** Texto con enlaces
    - **Descripción:** "Al continuar aceptas nuestros Términos y Condiciones y Aviso de Privacidad."
      Los enlaces se respetan; las negritas las pone el CSS
    - **Por defecto:** ninguno

15. **`Error Response Message`**
    - **Tipo:** Texto
    - **Descripción:** Mensaje cuando el servicio falla sin mandar un mensaje propio (sin red, sin
      respuesta, respuesta que no es JSON)
    - **Por defecto:** `errorResponseMessage` de `scripts/foundations/messages.js` (también si la fila
      está vacía)

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- El **título**, la **descripción** y los **tabs**
- Las **etiquetas** y **textos de ejemplo** de los campos
- Los **enlaces** de contraseña olvidada, invitado y textos legales
- El **Endpoint** del servicio, a dónde ir con sesión (**Redirect With Session**) y el **mensaje
  de error** genérico
- **Estilos** y **clases** extra del bloque

![Vista Tabla en Drive](/documentation/readme/login/drive-table.png)

### Servicio de inicio de sesión

`POST` a la fila `Endpoint`. `meta` y `security` van fijos (`LOGIN_REQUEST_META` y
`LOGIN_REQUEST_SECURITY` en `login.js`), como los pide el servicio:

```json
{
  "meta": { "requestId": "REQ-AUTH-LOGIN-001", "correlationId": "CORR-AUTH-001",
            "timestamp": "2026-10-20T18:00:00Z", "channel": "WEB", "platform": "DESKTOP" },
  "security": { "auth": { "type": "Bearer", "value": "Bearer {{bearer_token}}" },
                "nonce": "NONCE-REQ-AUTH-LOGIN-001", "signature": "{{hmac_signature}}" },
  "data": { "emailOrPhone": "cliente@ejemplo.com", "password": "Password123" }
}
```

#### Datos que se envían

Por ahora `data` es **siempre** `FIXED_CREDENTIALS` (el usuario del mock). Para enviar lo que
escribe el usuario, en `login.js` se cambia una sola línea:

```js
const SEND_FORM_CREDENTIALS = true; // false = siempre FIXED_CREDENTIALS
```

Con `true`, `readLoginCredentials` toma `emailOrPhone` (sin espacios al inicio y al final) y
`password` de los campos del formulario. Los campos ya se llaman como los pide el servicio.

#### Respuestas

| Respuesta | Qué hace el bloque |
|---|---|
| **200** `{ status, data: { user, accessToken, tokenType, expiresIn, sessionId, nextStep } }` | Guarda la sesión (`signIn`); con `Redirect With Session` muestra `status.message` en verde y va a esa ruta. En modo paso no navega: el login se oculta |
| **400** `{ status, errors: [{ field, message }] }` | `status.message` arriba y cada `errors[].message` debajo de su campo (`emailOrPhone`, `password`); al escribir en el campo se quita su mensaje |
| **401** `{ status, errors: [{ field: "credentials", message }] }` | `status.message` + los mensajes sin campo, arriba ("El correo/teléfono o la contraseña son incorrectos. Verifica tus datos e inténtalo nuevamente.") |
| **500** `{ status }` | `status.message` arriba ("Ocurrió un error al iniciar sesión.") |
| Sin red, sin respuesta o 200 sin `accessToken` | `Error Response Message` arriba |

Es una llamada pública (`REQUEST_TYPE.PUBLIC`); las respuestas de error conservan su JSON gracias a
`publicRequestInterceptor`
(`scripts/api/interceptors.js`). La sesión dura `expiresIn` segundos y vive en `sessionStorage`
(se borra al cerrar la pestaña); el `refreshToken` no se guarda porque aún no hay servicio para
renovar el token.

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Al entrar | Tab **Iniciar sesión** activo y su formulario |
| Clic en **Crear cuenta** (o flechas / Inicio / Fin en los tabs) | Se oculta el formulario y se muestra el panel de crear cuenta (vacío por ahora) |
| Clic en **Iniciar sesión** (botón) | Se envía el inicio de sesión; el botón se desactiva hasta la respuesta (ver [Respuestas](#respuestas)) |
| Error del servicio | El mensaje sale arriba y el cursor va al primer campo con error |
| Sin `Endpoint` | El botón no envía nada |
| Abre la página ya con sesión (con `Redirect With Session`) | Va directo a esa ruta, sin ver el formulario |
| Modo paso (sin `Redirect With Session`) | Sin sesión se ve el login; con sesión o como invitado se oculta y el paso queda cumplido, sin recargar |
| Panel de edición | Se ve el formulario y no redirige, para poder editarlo |
| Falta `Login Tab` o `Register Tab` | Sin tabs, solo el formulario |
| Falta `Guest Button` | Sin separador ni botón de invitado |
| Un enlace no es del sitio ni `http(s)` (p. ej. `javascript:`) | Se muestra solo el texto, sin enlace |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/login/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/login/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/login/component-mobile.png)

### Archivos y dependencias

- `login.js` – Lee la tabla y construye título, tabs, formulario y texto legal
- `login.css` – Estilos del bloque, todos dentro de `.login` (tamaños, colores y resoluciones)
- `scripts/foundations/block-options.js` – Filas `Styles` y `Classname`
- `scripts/foundations/block-utils.js` – `readTableCell` y `getSafeHref`
- `scripts/foundations/messages.js` – `errorResponseMessage` por defecto
- `scripts/foundations/session.js` – `signIn`, `continueAsGuest`, `navigateTo`, `toSitePath` y
  `setSessionVisibility` (modo paso)
- `styles/foundations/sessions.css` – Oculta el login en modo paso cuando ya hay sesión
- `scripts/api/http-client.js` – `post` con `REQUEST_TYPE.PUBLIC`
  (`scripts/api/interceptors.js`)
- `styles/foundations/grid.css` – Columna centrada (`container-fluid > row row-center > col-24`)
- `styles/foundations/breakpoints.css` – Resoluciones (mobile, tablet y desktop)
- Colores en `styles/colors.css` (`--login-*`)
- Documento de Drive: `content-drive/login.docx` (página `/login`)
- Pendiente: enviar los datos del formulario (`SEND_FORM_CREDENTIALS`), la página `/datos` a la
  que manda el servicio y el bloque de crear cuenta (tab **Crear cuenta**)
