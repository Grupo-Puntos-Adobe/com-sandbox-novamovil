# Foundations · JavaScript

Archivos de JavaScript **portables**: no dependen de ningún bloque del proyecto y se pueden llevar
a otro sitio de AEM Edge Delivery Services. Son el par de `styles/foundations/` (CSS, ver su
`README.md`).

`scripts/aem.js`, `scripts/scripts.js` y `404.html` quedan como el template. Los bloques importan
lo que usan. La única excepción es `session.js`: `head.html` lo carga con **una línea** (antes de
`scripts.js`) para que la regla de sesión de la página se revise en todas las páginas, tengan
bloques o no.

## Resumen: para qué es cada archivo

| Archivo | Para qué es | Lo usan | Depende de |
|---|---|---|---|
| [`block-options.js`](#1-block-optionsjs) | Las filas opcionales que **cualquier bloque NovaMóvil** acepta en Drive: `Styles`, `Classname`, `Session` y el estado en la última columna | Todos los bloques NovaMóvil (1.ª línea de `decorate`) | `session.js` |
| [`block-utils.js`](#2-block-utilsjs) | Ayudas **sin red** para leer la tabla del bloque, validar enlaces y crear elementos | Los bloques NovaMóvil y `session.js` | `messages.js` |
| [`messages.js`](#3-messagesjs) | Los **mensajes genéricos** con valor por defecto y el idioma / moneda | `card-*`, `product-*`, `login`, `block-session-example`, `empty-list-message` | nada |
| [`toast.js`](#4-toastjs) | La **alerta flotante** (arriba a la derecha, se cierra sola) | `card-*`, `product-catalog` | `scripts/aem.js` (`loadCSS`), `styles/foundations/toast.css` |
| [`page-context.js`](#5-page-contextjs) | Pasar **cualquier valor** entre bloques de la misma página sin que se importen, por apartados (hoy: el nombre del breadcrumb) | `product-detail` (lo pone) y `breadcrumb` (lo lee) | nada |
| [`session.js`](#6-sessionjs) | **Todo lo de sesión**: iniciar / cerrar sesión, invitado, leer los datos, reglas de las páginas y mostrar u ocultar | `head.html`, `block-options.js`, `login`, `block-session-example`, `account-profile`, `scripts/api/interceptors.js` | `block-utils.js` (`toSafeSitePath`), `styles/foundations/sessions.css` |

```js
// cómo se importan desde un bloque (blocks/<bloque>/<bloque>.js)
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { readTableCell, readEndpoint, createElementWithClass } from '../../scripts/foundations/block-utils.js';
import MESSAGES, { LOCALE, CURRENCY } from '../../scripts/foundations/messages.js';
import { showToast } from '../../scripts/foundations/toast.js';
import { PAGE_CONTEXT, setPageContext, onPageContext } from '../../scripts/foundations/page-context.js';
import { getSessionData, loginUser, logoutUser } from '../../scripts/foundations/session.js';
```

---

## 1. `block-options.js`

**Para qué es:** que el autor pueda, desde la tabla de Drive y sin tocar código, darle espacio y
clases a un bloque, decidir quién lo ve y tener filas distintas por sesión. Cada bloque NovaMóvil lo
llama en la **primera línea** de su `decorate()`; los bloques del template no lo usan. Guía completa:
`documentation/06-styles-classname.md`.

### Funciones

| Función | Recibe | Qué hace | Para qué sirve |
|---|---|---|---|
| `applyBlockOptions(block)` (default) | El bloque | 1) Si la página está redirigiendo, vacía el bloque. 2) Aplica las filas por sesión (`filterRowsBySessionState`). 3) Lee, aplica y **quita** las filas `Styles`, `Classname` y `Session` | La única que llaman los bloques: después de ella, el bloque lee su tabla sin ver esas filas |
| `applyAuthorStyles(block, declarations)` | El bloque y el texto de `Styles` (`margin-top: 60; padding-left: 20`) | Pone cada declaración en línea; un número sin unidad pasa a `px`; ignora lo inválido o inseguro (`url()`, `<`, `{`…) | La usa `applyBlockOptions`; sirve sola si un bloque quiere aplicar estilos de otra fila |
| `applyAuthorClasses(block, names)` | El bloque y el texto de `Classname` (`dark compact`) | Agrega cada nombre válido como clase (separados por espacio, coma o `;`) | La usa `applyBlockOptions`; igual que la anterior, sirve sola |

### Las filas que lee

| Fila / celda | Qué hace |
|---|---|
| `Styles` | Estilos en línea sobre el bloque (y `display: flow-root` en su wrapper para que los márgenes no se colapsen) |
| `Classname` | Clases extra sobre el bloque |
| `Session` | `true` = el bloque y su wrapper solo con sesión; `false` = solo sin sesión (el invitado cuenta como "sin sesión"); vacía = siempre |
| Estado en la **última columna** de cualquier fila | `signed-in`, `signed-out`, `guest` (combinables con coma): la fila solo existe para ese estado |

Solo le pregunta a `session.js` por la sesión si el bloque trae la fila `Session` o un estado en la
última columna.

```js
import applyBlockOptions from '../../scripts/foundations/block-options.js';

export default function decorate(block) {
  applyBlockOptions(block); // FIRST line: Styles / Classname / Session rows and session rows
  // … el resto del bloque lee su tabla como siempre
}
```

---

## 2. `block-utils.js`

**Para qué es:** las ayudas que repetirían todos los bloques: leer una fila de la tabla, leer el
endpoint, validar enlaces que vienen de un servicio, armar el título, formatear precios y crear
elementos. **No hace llamadas de red.**

### Leer la tabla

| Función | Recibe | Devuelve | Para qué sirve |
|---|---|---|---|
| `readTableCell(block, rowName)` | El bloque y el nombre de la fila (sin distinguir mayúsculas) | `{ text, href, found }`: el texto, el enlace tal cual y si la fila existe | Leer **cualquier** fila (`Title`, `Button Text`, `Product Link`…) |
| `readEndpoint(block)` | El bloque | La URL de la fila `Endpoint` (el enlace o el texto), o `''` | El servicio **público** del bloque → `get` / `post` |
| `readPrivateEndpoint(block)` | El bloque | La URL de la fila `Private Endpoint` (también `PrivateEndpoint`), o `''` | El servicio **privado** (con token) → `post(…, { interceptor: REQUEST_TYPE.PRIVATE })` |
| `readRowTextOrDefault(block, rowName, defaultText)` | El bloque, la fila y el texto por defecto | Sin la fila → `defaultText`; fila vacía → `''`; con texto → el texto | Mensajes que tienen valor por defecto (`Empty List Title`…) pero que el autor puede dejar vacíos a propósito |
| `getAlertOptions(config)` | `readBlockConfig(block)` | `{ duration, variant }` desde `Alert Duration` (segundos, 5 por defecto) y `Alert Color` (`error` por defecto) | Las opciones de `showToast` |

### Validar

| Función | Recibe | Devuelve | Para qué sirve |
|---|---|---|---|
| `getSafeHref(path)` | Una ruta o URL (de Drive o de un servicio) | Rutas del sitio y `http(s)`: `/celulares` → `/celulares`; `https://otro.com/x` → la URL; `javascript:`, `data:`, vacío → `null` | Poner un `href` sin riesgo |
| `toSafeSitePath(path)` | Una ruta | Solo rutas **de este sitio** (`/cuenta?x=1`); `''` para `https://otro.com`, `//otro.com`, `javascript:`… | Enlaces que nunca deben sacar al visitante del sitio (`Redirect To`, invitado, `Login Link`) |

### Pintar

| Función | Recibe | Devuelve | Para qué sirve |
|---|---|---|---|
| `createElementWithClass(tag, className, text)` | La etiqueta, sus clases y, opcional, su texto | El elemento, con el texto **como texto** (nunca HTML) | Crear el markup de un bloque. Está **una sola vez aquí**: los bloques la importan en lugar de copiarla |
| `buildSectionTitle(block, prefix)` | El bloque y el prefijo de sus clases | `div.{prefix}-header > div.{prefix}-heading[role=heading][aria-level=2]` con el texto de la fila `Title`, o `null` sin texto | El título de las secciones de tarjetas, **dentro** del bloque (así `Styles` lo rodea) |
| `formatPrice(value, currency)` | Un número y un código de moneda | `$19,999` en `LOCALE`, sin decimales; un código inválido usa `CURRENCY` | Los precios de las tarjetas y el detalle |

```js
import {
  createElementWithClass, readEndpoint, readRowTextOrDefault, readTableCell,
} from '../../scripts/foundations/block-utils.js';
import MESSAGES from '../../scripts/foundations/messages.js';

const title = readTableCell(block, 'title').text;            // '' sin la fila
const endpoint = readEndpoint(block);                        // servicio público
const emptyTitle = readRowTextOrDefault(block, 'empty list title', MESSAGES.emptyListTitle);
const card = createElementWithClass('div', 'card-featured-item', title);
```

| Función | La usan |
|---|---|
| `readTableCell` | `card-*`, `product-*`, `login`, `block-session-example`, `account-profile` |
| `readEndpoint` | `card-*`, `product-detail`, `login` (`product-catalog` lee `Filters Endpoint` y `Search Endpoint` con `readTableCell`) |
| `readPrivateEndpoint` | `block-session-example` (y los bloques privados que vengan) |
| `readRowTextOrDefault` | `card-*`, `product-catalog`, `product-detail` |
| `getAlertOptions` | `card-*`, `product-catalog` |
| `getSafeHref` | `breadcrumb`, `card-*`, `product-*`, `login` y `toSafeSitePath` |
| `toSafeSitePath` | `login`, `block-session-example` y `session.js` (`Redirect To`) |
| `createElementWithClass` | `card-*`, `product-*`, `login`, `block-session-example`, `account-profile` |
| `buildSectionTitle` | `card-*` |
| `formatPrice` | `card-featured`, `product-catalog`, `product-detail` |

---

## 3. `messages.js`

**Para qué es:** tener en un solo lugar los **mensajes genéricos** (los que no son contenido) y el
idioma / la moneda. Un bloque usa estos mensajes **solo cuando su tabla no trae la fila**. El
contenido (títulos, botones, enlaces…) no tiene valor por defecto: viene de la tabla o no se pinta.

| Exporta | Qué es | Para qué sirve |
|---|---|---|
| `MESSAGES` (default) | Objeto con los mensajes | Valor por defecto de las filas de mensajes (tabla de abajo) |
| `LOCALE` | `'es-MX'` | Idioma de números y precios (`Intl.NumberFormat`) |
| `CURRENCY` | `'MXN'` | Moneda cuando un precio del servicio no trae una (o trae un código inválido) |

| Clave de `MESSAGES` | Fila de Drive | Cuándo se ve |
|---|---|---|
| `errorResponseMessage` | `Error Response Message` (también si la fila está vacía) | Un servicio falla o no contesta |
| `emptyListTitle` / `emptyListDescription` | `Empty List Title` / `Empty List Description` | La lista llegó vacía |
| `imageErrorMessage` | `Image Error Message` | Una foto falta o no carga |

---

## 4. `toast.js`

**Para qué es:** mostrar una **alerta flotante** arriba a la derecha (debajo del header), apilable,
con botón de cerrar, que se cierra sola. Carga `styles/foundations/toast.css` la primera vez.

| Exporta | Recibe | Qué hace | Para qué sirve |
|---|---|---|---|
| `showToast(message, { duration, variant })` | El texto; `duration` en ms (5000 por defecto); `variant`: `error` (por defecto), `warning`, `success`, `info` o un color hex | Crea la alerta (`role="alert"` para error y aviso, `role="status"` para las demás), la apila y la quita al terminar el tiempo (se pausa con el mouse o el foco encima) | Avisar que un servicio falló (`card-*`, `product-catalog`) |
| `TOAST_VARIANTS` | — | `['error', 'warning', 'success', 'info']` | Saber qué variantes existen |

Internas (no se importan): `restack()` acomoda las alertas visibles una debajo de otra y
`removeToast(toast)` quita una y vuelve a acomodar las demás.

```js
import { showToast } from '../../scripts/foundations/toast.js';
import { getAlertOptions } from '../../scripts/foundations/block-utils.js';

showToast('No pudimos cargar las categorías', getAlertOptions(readBlockConfig(block)));
```

---

## 5. `page-context.js`

**Para qué es:** que un bloque le pase **cualquier valor** a otro bloque **de la misma página** sin
importarse entre ellos (un nombre, un precio, un plan…). Cada valor tiene su **apartado**, una llave
en `PAGE_CONTEXT`, y en Drive se escribe esa llave entre llaves: `{breadcrumb-name}`.

Hoy hay un apartado: **Breadcrumb**, con `BREADCRUMB_NAME`. El detalle del celular pone el nombre del
producto cuando llega del servicio, y el breadcrumb lo muestra en su nivel `{breadcrumb-name}`.

```js
export const PAGE_CONTEXT = {
  // Breadcrumb: un valor por cada nivel dinámico
  BREADCRUMB_NAME: 'breadcrumb-name', // en Drive {breadcrumb-name}: la página actual
};
```

| Exporta | Recibe | Qué hace | Para qué sirve |
|---|---|---|---|
| `PAGE_CONTEXT` | — | Los apartados: una llave por cada valor que se puede pasar | Saber qué se puede transmitir; la marca de Drive es `{llave}` |
| `setPageContext(key, value)` | La llave y el valor (`'Apple iPhone 15 Pro'`) | Lo guarda y lanza `PAGE_CONTEXT_EVENT` | El bloque que **conoce** el valor |
| `getPageContext(key)` | La llave | El valor guardado, o `''` | Leer el valor en cualquier momento |
| `onPageContext(key, callback)` | La llave y una función | Llama a `callback(value)` **ahora si ya hay valor y cada vez que cambie**. Devuelve una función para dejar de escuchar | El bloque que lo **necesita**: no importa si carga antes o después del que lo pone |
| `fillPageContext(text)` | Un texto de la tabla | Cambia **todas** las marcas por sus valores: `'Detalle de {breadcrumb-name}'` → `'Detalle de Apple iPhone 15 Pro'`. Sin marcas → el texto tal cual; con una marca sin valor todavía → `''` | Pintar texto dinámico en **cualquier** bloque |
| `hasPageContext(text)` | Un texto de la tabla | `true` si trae alguna marca de `PAGE_CONTEXT` | Saber si hay que esperar un valor |
| `PAGE_CONTEXT_EVENT` | — | Evento en `document`; `detail = { key, value }` | Lo usa `onPageContext` por dentro; un bloque con varias marcas puede escucharlo directo |

**Sin marca se ve el texto que escribió el autor:** solo lo que necesita ser dinámico la lleva.

```js
import {
  PAGE_CONTEXT, fillPageContext, onPageContext, setPageContext,
} from '../../scripts/foundations/page-context.js';

// el bloque que conoce el valor (product-detail)
setPageContext(PAGE_CONTEXT.BREADCRUMB_NAME, product.name);

// cualquier bloque que lo muestra: 'Detalle de {breadcrumb-name}' → 'Detalle de Apple iPhone 15 Pro'
const authored = readTableCell(block, 'title').text;
onPageContext(PAGE_CONTEXT.BREADCRUMB_NAME, () => {
  title.textContent = fillPageContext(authored);
});
```

### Agregar un valor nuevo (otro nivel dinámico u otro apartado)

1. **Una línea en `PAGE_CONTEXT`**, con el apartado primero y luego qué es:
   `BREADCRUMB_BRAND: 'breadcrumb-brand'` o `PLAN_PRICE: 'plan-price'`.
2. **El bloque que conoce el valor** lo pone: `setPageContext(PAGE_CONTEXT.BREADCRUMB_BRAND, product.brand)`.
3. **En Drive** se escribe la marca: `{breadcrumb-brand}`.

Las funciones no cambian. Por ejemplo, un breadcrumb con dos niveles dinámicos:

```
| Breadcrumb |                         |
| Level 1    | [Inicio](/)             |
| Level 2    | [Celulares](/celulares) |
| Level 3    | {breadcrumb-brand}      |   ← "Apple"
| Level 4    | {breadcrumb-name}       |   ← "iPhone 15 Pro"
```

Cada nivel espera **su** valor: mientras no llega no se pinta, y los demás sí. En un mismo texto se
pueden mezclar varias marcas (`{breadcrumb-brand} {breadcrumb-name}`). El enlace de un nivel sigue
siendo el que escribe el autor.

---

## 6. `session.js`

**Para qué es:** todo lo de sesión en **un solo archivo**: iniciar y cerrar sesión, el modo
invitado, leer los datos del usuario, las reglas de cada página (Metadata `Session` /
`Redirect To`) y mostrar u ocultar elementos según quién visita. No depende de `aem.js`. Guía para
autores y desarrolladores: `documentation/08-sesiones.md`.

### Cómo arranca

`head.html` lo carga en **todas las páginas**, antes de `scripts.js`. Al cargar, una sola vez y
solo:

1. agrega `styles/foundations/sessions.css`;
2. pone el estado en `<html>` (`session-state-signed-in`, `-guest`, `-signed-out`, o `-editor` en
   el panel de edición);
3. revisa la regla del Metadata de la página y, si el visitante no puede estar ahí, oculta la
   página y lo manda a `Redirect To`.

| Metadata | Sin sesión (o invitado) | Con sesión |
|---|---|---|
| `Session` = `true` | Va a `Redirect To` | Se ve |
| `Session` = `false` | Se ve | Va a `Redirect To` (por ejemplo la página `login`) |
| sin `Session` o vacía | Se ve | Se ve |

`Redirect To` sin la fila o vacía → home `/`. Nada se agrega a la URL. En el panel de edición nunca
redirige. La regla se vuelve a revisar si la sesión cambia en la página.

### Funciones para los bloques

| Función | Recibe | Qué hace / devuelve | Para qué sirve |
|---|---|---|---|
| `getSessionData()` | — | **Todo lo de la sesión en un solo llamado** (tabla de abajo) | Saber si hay sesión, quién visita, sus datos y la regla de la página |
| `loginUser(endpoint, requestBody)` | La URL del servicio de login y el cuerpo que pide (`{ meta, security, data: { emailOrPhone, password } }`) | `POST` (llamada pública); con un 200 guarda la sesión en `sessionStorage`, avisa a la página y devuelve `getSessionData()`. Si falla lanza el `ApiError` (el JSON del servicio en `error.cause`) | **Iniciar sesión** desde cualquier bloque |
| `logoutUser()` | — | Por ahora borra la sesión y el modo invitado de `sessionStorage` y avisa a la página. Es `async`, lista para llamar un servicio de logout | **Cerrar sesión** |
| `continueAsGuest()` | — | Guarda un usuario `guest` ("Invitado") con los mismos campos que uno real y su propio `sessionId`, sin token | El botón "Continuar como invitado" |
| `goToPage(path, { replace })` | Una ruta del sitio | Va a esa página; una recarga pedida por las filas por sesión no la cancela | Navegar después de iniciar sesión o entrar como invitado |
| `showOnlyForSessionStates(element, states)` | Un elemento y los estados (`'signed-in, guest'` o `['signed-in']`) | Le pone las clases de `sessions.css`; sin estados, se ve para todos | Mostrar u ocultar una parte de un bloque, al instante |

| Constante | Valor | Para qué sirve |
|---|---|---|
| `SESSION_CHANGE_EVENT` | `'session:change'` | Evento en `document` después de **cualquier** cambio (iniciar o cerrar sesión, invitado, vencimiento); `detail` = `getSessionData()`. Sirve para volver a pintar sin recargar |
| `SESSION_STATES` | `{ SIGNED_IN: 'signed-in', GUEST: 'guest', SIGNED_OUT: 'signed-out' }` | Comparar estados sin escribir el texto a mano |
| `PAGE_SESSION_RULES` | `{ REQUIRED: 'true', SIGNED_OUT_ONLY: 'false' }` | Comparar `getSessionData().page.rule` |
| `USER_FIELDS` | `['fullName', 'email', 'phone', 'userId', 'verified', 'sessionId']` | Las `key` de `fields`, en ese orden |

### Qué trae `getSessionData()`

```js
const {
  state, isSignedIn, isGuest, user, fields, page, isEditingToolPreview,
} = getSessionData();
```

| Propiedad | Qué trae | Sin sesión |
|---|---|---|
| `state` | `'signed-in'`, `'guest'` o `'signed-out'` | `'signed-out'` |
| `isSignedIn` | `true` con una sesión real (el invitado **no** cuenta) | `false` |
| `isGuest` | `true` después de "Continuar como invitado" | `false` |
| `user` | `{ userId, firstName, lastName, fullName, email, phone, verified, sessionId }`, de la sesión o del invitado (`guest`, "Invitado") | `null` |
| `fields` | Los datos del usuario **ya armados para pintar**, sin vacíos: `[{ key: 'fullName', value: 'Cliente Nova' }, { key: 'email', value: … }, …]` | `[]` |
| `page.rule` | `'true'`, `'false'` o `''` (la fila `Session` del Metadata) | igual |
| `page.redirectPath` | La ruta de `Redirect To`, o `/` | igual |
| `page.isAccessAllowed` | `false` mientras la página está redirigiendo | igual |
| `isEditingToolPreview` | `true` en el panel de edición (no redirige, se ve todo) | igual |

**Nunca** trae el token. Una sesión vencida cuenta como "sin sesión" (se borra sola).

### Ejemplo: leer y volver a pintar

```js
import { SESSION_CHANGE_EVENT, getSessionData } from '../../scripts/foundations/session.js';

const LABELS = { fullName: 'Nombre', email: 'Correo', phone: 'Teléfono' };

// el bloque decide qué pintar y con qué texto: solo pone su etiqueta a cada key
const paint = ({ user, fields }) => {
  list.replaceChildren(...fields
    .filter(({ key }) => LABELS[key])
    .map(({ key, value }) => createElementWithClass('div', 'my-block-field', `${LABELS[key]}: ${value}`)));
  greeting.textContent = user ? `Hola, ${user.firstName}` : 'Inicia sesión';
};
paint(getSessionData());                                                          // al cargar
document.addEventListener(SESSION_CHANGE_EVENT, (event) => paint(event.detail));  // al cambiar
```

Ejemplos reales: `blocks/account-profile/` (sencillo: Mi cuenta) y `blocks/block-session-example/`
(todo junto).

### Para otros archivos de foundations (no para bloques)

| Función | La usa | Qué hace |
|---|---|---|
| `filterRowsBySessionState(block)` | `block-options.js` | Las filas cuya **última celda** es solo estados quedan solo para esos estados y se les quita esa celda; cada fila que queda guarda sus estados en `row.dataset.session` (`"signed-in guest"`). La página se recarga al cambiar la sesión |
| `getAuthorizationHeader()` | `scripts/api/interceptors.js` | `'Bearer …'` para la llamada privada, o `''`. Es la **única** que da el token |
| `clearUserSession()` | `scripts/api/interceptors.js` | Solo borra lo guardado, sin llamar a un servicio (en un 401 el token ya no sirve). Un bloque cierra sesión con `logoutUser()` |

### Funciones internas (no se importan)

| Función | Qué hace |
|---|---|
| `initPageSession()` | El arranque de cada página (CSS, estado, regla); corre sola al cargar el archivo |
| `applyPageSessionRule()` / `canStayOnPage(rule)` | Aplican la regla `Session` del Metadata y redirigen si hace falta |
| `readPageSessionRule()` / `getPageRedirectPath()` / `readPageMetadataValue(name)` | Leen el Metadata (`page.rule`, `page.redirectPath`) |
| `readLoginSession()` / `readGuestSession()` / `readSessionState()` | Leen lo guardado en `sessionStorage` (la sesión vencida se borra) |
| `storeLoginSession(data)` | Guarda la respuesta 200 del login (la usa `loginUser`) |
| `notifySessionChange()` / `updateSessionStateClass()` | Lanzan `SESSION_CHANGE_EVENT` y cambian la clase de `<html>` |
| `parseSessionStateList(text)` / `isSessionStateText(text)` | `'signed-in, guest'` → `['signed-in', 'guest']` / ¿la celda es solo estados? |
| `reloadPageOnSessionChange()` | Recarga la página con filas por sesión cuando la sesión cambia |
| `loadSessionStyles()` / `useStorage()` / `readStoredJson()` / `isEditingToolPreview()` | Cargar `sessions.css`, `sessionStorage` sin errores y detectar el panel de edición |

### Ajustes

Al inicio del archivo, para adaptarlo a otro proyecto:

| Ajuste | Valor hoy | Para qué |
|---|---|---|
| `SESSION_STORAGE_KEY` / `GUEST_STORAGE_KEY` | `novamovil-session` / `novamovil-guest` | Llaves en `sessionStorage` |
| `DEFAULT_REDIRECT_PATH` | `/` | A dónde va una página sin `Redirect To` |
| `GUEST_USER` | `{ userId: 'guest', firstName: 'Invitado', … }` | El usuario que se guarda al continuar como invitado |
| `USER_FIELDS` | `fullName`, `email`, `phone`, `userId`, `verified`, `sessionId` | Qué datos trae `fields` y en qué orden |
| `EDITOR_PREVIEW_HOSTS` | `preview-aemcoder.adobe.io` | Dónde no se redirige y se ve todo |

### Seguridad

- **Ocultar no es proteger:** el HTML y el JavaScript son públicos. Los datos privados solo deben
  llegar del servicio con el token.
- El token nunca va en el código ni en Drive: sale de `getAuthorizationHeader()` después del login.
- Las rutas de Drive (`Redirect To`) solo aceptan rutas del sitio (`toSafeSitePath`).
- Nunca se escribe la sesión en `console`.

---

## Llevarlos a otro proyecto

1. Copia `scripts/foundations/` y `styles/foundations/`.
2. Para las sesiones, agrega a `head.html`, antes de `scripts.js`, una línea:
   `<script nonce="aem" src="/scripts/foundations/session.js" type="module"></script>`. No hay que
   tocar `scripts.js` ni `aem.js`.
3. Ajusta lo propio del sitio:
   - **`messages.js`:** los textos, el idioma (`LOCALE`) y la moneda (`CURRENCY`);
   - **la alerta:** sus colores (`--toast-*`) y la capa `--z-index-toast`;
   - **`session.js`:** sus [ajustes](#ajustes).

La API (`scripts/api/`: `http-client.js` e `interceptors.js`) no está aquí porque lleva la URL base
y los interceptores de este proyecto; su referencia está en `scripts/api/README.md`. Su llamada
privada usa `session.js`.
