# Foundations · JavaScript

Archivos de JavaScript **portables**: no dependen de ningún bloque del proyecto y se pueden llevar
a otro sitio de AEM Edge Delivery Services. Son el par de `styles/foundations/` (CSS).

| Archivo | Qué hace | Exporta |
|---|---|---|
| `block-options.js` | Filas opcionales `Styles`, `Classname` y `Session` (`true` / `false`) de los bloques NovaMóvil y las filas con el estado en la última columna. Es el **punto de entrada de las sesiones**: al importarse carga `sessions.css` y revisa la regla de la página. Guía: `documentation/06-styles-classname.md` | `applyBlockOptions(block)` (default), `applyAuthorStyles(block, declarations)`, `applyAuthorClasses(block, names)` |
| `block-utils.js` | Ayudas para leer la tabla del bloque y validar datos de servicios | `readTableCell`, `readRowTextOrDefault`, `getAlertOptions`, `getSafeHref`, `buildSectionTitle`, `formatPrice` |
| `messages.js` | Mensajes genéricos con valor por defecto (alerta, lista vacía, foto que falla) y el formato de números / precios | `MESSAGES` (default), `LOCALE`, `CURRENCY` |
| `toast.js` | Alerta flotante arriba a la derecha, apilable, que se cierra sola | `showToast(message, { duration, variant })`, `TOAST_VARIANTS` |
| `page-context.js` | Datos que un bloque obtiene al cargar y otro bloque de la misma página necesita, sin importarse entre ellos (hoy: el nombre de la página actual) | `setCurrentPageName(name)`, `getCurrentPageName()`, `CURRENT_PAGE_NAME_EVENT` |
| `session.js` | **Todo lo de sesión**, en 3 partes: datos, reglas de página y mostrar / pintar según la sesión (ver [session.js](#sessionjs) abajo). Va con `styles/foundations/sessions.css`. Guía: `documentation/08-sesiones.md` | Ver la sección [session.js](#sessionjs) |

## Qué necesita cada uno

| Archivo | Depende de |
|---|---|
| `block-options.js` | `scripts/aem.js` (`loadCSS`), `session.js` y `styles/foundations/sessions.css` |
| `block-utils.js` | `messages.js` (para `formatPrice`) |
| `messages.js` | nada |
| `page-context.js` | nada |
| `session.js` | `scripts/aem.js` (`getMetadata`), `block-utils.js` (`getSafeHref`) y `styles/foundations/sessions.css` |
| `toast.js` | `scripts/aem.js` (`loadCSS`), `styles/foundations/toast.css` y sus colores `--toast-*` en `styles/colors.css`, más `--z-index-toast` en `styles/styles.css` |

## Llevarlos a otro proyecto

1. Copia `scripts/foundations/` y `styles/foundations/`.
2. Importa desde los bloques con la ruta de la carpeta:

   ```js
   import applyBlockOptions from '../../scripts/foundations/block-options.js';
   import { readTableCell, formatPrice } from '../../scripts/foundations/block-utils.js';
   import MESSAGES, { LOCALE, CURRENCY } from '../../scripts/foundations/messages.js';
   import { showToast } from '../../scripts/foundations/toast.js';
   import { signIn, getAccessState, renderForSession } from '../../scripts/foundations/session.js';
   ```

3. Ajusta lo propio del sitio:
   - **`messages.js`:** los textos, el idioma (`LOCALE`) y la moneda (`CURRENCY`);
   - **la alerta:** sus colores (`--toast-*`) y la capa `--z-index-toast`;
   - **`session.js`:** sus ajustes (ver [Ajustes](#ajustes)).

No hay que tocar `scripts.js` ni `head.html`: las sesiones arrancan desde `block-options.js`.

La API (`scripts/api/`: `http-client.js` e `interceptors.js`) no está aquí porque lleva la URL base
y los interceptores de este proyecto.

---

## session.js

Todo lo de sesión en **un solo archivo**: quién visita, qué páginas puede abrir y qué ve. Lo que es
propio del sitio llega desde Drive (Metadata y filas de las tablas) o desde sus [ajustes](#ajustes).
Guía completa para autores y desarrolladores: `documentation/08-sesiones.md`.

### Cómo arranca

No se llama desde `scripts.js`. La primera vez que un bloque importa `block-options.js`:

1. `session.js` pone el estado en `<html>` (`session-state-signed-in`, `-guest`, `-signed-out`, o
   `-editor` en el panel de edición).
2. `block-options.js` carga `styles/foundations/sessions.css` y llama `guardPage()`, que revisa el
   Metadata de la página y redirige si no acepta al visitante.
3. En cada bloque, `applyBlockOptions` llama `applySessionRows(block)` y aplica la fila `Session`.

### Los tres estados

| Estado | Cuándo |
|---|---|
| `signed-in` | Hay sesión vigente (el login respondió 200 y no venció `expiresIn`) |
| `guest` | Eligió "Continuar como invitado" (no tiene token) |
| `signed-out` | Ninguno de los dos |

### Parte 1 · Datos de la sesión

| Función | Qué hace |
|---|---|
| `signIn(data)` | Guarda la sesión de un login 200 (`user`, `accessToken`, `tokenType`, `expiresIn`, `sessionId`) y quita el modo invitado. Devuelve la sesión o `null` sin `accessToken` |
| `continueAsGuest()` | Activa el modo invitado |
| `signOut()` | Borra la sesión y el modo invitado |
| `getSession()` | `{ user, accessToken, tokenType, expiresAt, sessionId }` o `null` (si venció, la borra) |
| `isSignedIn()` | `true` mientras hay sesión |
| `getAccessState()` | `'signed-in'`, `'guest'` o `'signed-out'` |
| `getAccessToken()` | `'Bearer …'` para el header `Authorization`, o `''` |
| `SESSION_CHANGE_EVENT` | Evento en `document` después de cualquier cambio; `detail = { state, session }` |

La sesión vive en `sessionStorage` (se borra al cerrar la pestaña) y se cierra sola al vencer. El
`refreshToken` no se guarda. Nunca se escribe la sesión en `console`.

### Parte 2 · Páginas y redirecciones (Metadata de la página)

| Metadata | Sin sesión | Con sesión |
|---|---|---|
| `Session` = `true` | Va a `Redirect To` | Se ve |
| `Session` = `false` | Se ve | Va a `Redirect To` (por ejemplo `login`) |
| sin `Session` o vacía | Se ve | Se ve |

`Redirect To` sin la fila o vacía → home `/`. Nada se agrega a la URL. El invitado no cuenta como
sesión.

| Función | Qué hace |
|---|---|
| `guardPage()` | Aplica la regla de la página; la llama `block-options.js` una vez. Se repite al cambiar la sesión |
| `requireSession({ allowGuest, redirectTo })` | La regla `true` para un bloque que deba redirigir por sí mismo |
| `requireNoSession({ redirectTo })` | La regla `false` |
| `getPageSessionRule()` | `'true'`, `'false'` o `''` (la fila `Session` de la página) |
| `getSessionRedirectUrl({ redirectTo })` | La ruta de `Redirect To`, o `/` |
| `navigateTo(path, { replace })` | Ir a otra página sin que la recarga de las filas por sesión la cancele |
| `toSitePath(path)` | Solo rutas del sitio (`/cuenta`); `''` para `//otro.com`, `javascript:`… |
| `isEditorPreview()` | `true` en el panel de edición: ahí nunca redirige y se ve todo |

### Parte 3 · Mostrar y pintar según la sesión

| Función | Qué hace |
|---|---|
| `applySessionRows(block)` | Filas de 2 o más columnas cuya **última celda** es solo estados (`signed-in`, `signed-out`, `guest`, combinables con coma): quedan solo para esos estados y se les quita esa celda. Si la página tiene filas así, se recarga al cambiar la sesión |
| `setSessionVisibility(element, states)` | Pone las clases de `sessions.css` (`session-only session-only-signed-in`…); sin estados, visible para todos |
| `parseSessionStates(text)` | `'Signed-in, guest'` → `['signed-in', 'guest']` |
| `renderForSession(target, views)` | Pinta la vista del estado actual (`{ 'signed-in': (session) => …, 'signed-out': () => … }`) y la vuelve a pintar al cambiar; sin vista de `guest` usa la de `signed-out`. Devuelve una función para dejar de escuchar |

### Ejemplo en un bloque

```js
import {
  SESSION_STATES, getAccessState, renderForSession, setSessionVisibility,
} from '../../scripts/foundations/session.js';

// algo que solo ve quien tiene sesión (sessions.css lo oculta a los demás)
setSessionVisibility(couponCard, [SESSION_STATES.SIGNED_IN]);

// datos del usuario que se vuelven a pintar al cambiar la sesión
renderForSession(greeting, {
  [SESSION_STATES.SIGNED_IN]: (session) => `Hola, ${session.user.firstName}`,
  [SESSION_STATES.SIGNED_OUT]: () => 'Inicia sesión para ver tus cupones',
});

if (getAccessState() === SESSION_STATES.GUEST) { /* … */ }
```

Llamadas privadas con el token: `post(url, body, { interceptor: REQUEST_TYPE.PRIVATE })`
(`scripts/api/`). Ejemplo de todo junto: `blocks/block-session-example/`.

### Ajustes

Al inicio del archivo, para adaptarlo a otro proyecto:

| Ajuste | Valor hoy | Para qué |
|---|---|---|
| `SESSION_STORAGE_KEY` / `GUEST_STORAGE_KEY` | `novamovil-session` / `novamovil-guest` | Llaves en `sessionStorage` |
| `DEFAULT_SESSION_REDIRECT` | `/` | A dónde va una página sin `Redirect To` |
| `EDITOR_PREVIEW_HOSTS` | `preview-aemcoder.adobe.io` | Dónde no se redirige y se ve todo |
| `SESSION_CHANGE_EVENT` | `session:change` | Nombre del evento |

### Seguridad

- **Ocultar no es proteger:** el HTML y el JavaScript son públicos. Los datos privados solo deben
  llegar del servicio con el token.
- El token nunca va en el código ni en Drive: sale de `getAccessToken()` después del login.
- Las rutas de Drive (`Redirect To`) solo aceptan rutas del sitio.
