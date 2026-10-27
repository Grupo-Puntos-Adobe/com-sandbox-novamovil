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
| [`store.js`](#5-storejs) | **Variables globales** del sitio (como el estado de React): solo las declaradas en `STORE`; `get`, `set`, `reset` y `subscribe`, y las marcas `{store.breadcrumb.name}` de cualquier texto se llenan solas. Lo carga `head.html` (hoy: `breadcrumb` y `user`) | `head.html`, `session.js` (pone `user`), `product-detail` (pone `breadcrumb.name`), `account-profile` y `block-session-example` (leen `user`) | `styles/foundations/store.css` |
| [`session.js`](#6-sessionjs) | **Todo lo de sesión**: iniciar / cerrar sesión, invitado, estado, reglas de las páginas y mostrar u ocultar; pone el usuario en el store | `head.html`, `block-options.js`, `login`, `block-session-example`, `account-profile`, `scripts/api/interceptors.js` | `block-utils.js` (`toSafeSitePath`), `store.js` (pone `user`), `styles/foundations/sessions.css` |

```js
// cómo se importan desde un bloque (blocks/<bloque>/<bloque>.js)
import applyBlockOptions from '../../scripts/foundations/block-options.js';
import { readTableCell, readEndpoint, createElementWithClass } from '../../scripts/foundations/block-utils.js';
import MESSAGES, { LOCALE, CURRENCY } from '../../scripts/foundations/messages.js';
import { showToast } from '../../scripts/foundations/toast.js';
import { store } from '../../scripts/foundations/store.js';
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
| `filterRowsBySessionState(block)` (interna) | El bloque | Las filas cuya **última celda** es solo estados (`login`, `logout`, `guest`) quedan solo para ese estado y se les quita esa celda; cada fila que queda guarda sus estados en `row.dataset.session` (`"signed-in guest"`). El estado sale del store (`session`); al cambiar, la página se recarga una vez | Filas distintas por sesión en cualquier bloque |
| `showOnlyWhenSession(element, visibleWhen)` (interna) | El wrapper y `true` / `false` | Escucha `store.subscribe('session.isSession', …)` y le pone o quita `session-hidden` (`sessions.css`) | La fila `Session` del bloque |
| `applyAuthorStyles(block, declarations)` | El bloque y el texto de `Styles` (`margin-top: 60; padding-left: 20`) | Pone cada declaración en línea; un número sin unidad pasa a `px`; ignora lo inválido o inseguro (`url()`, `<`, `{`…) | La usa `applyBlockOptions`; sirve sola si un bloque quiere aplicar estilos de otra fila |
| `applyAuthorClasses(block, names)` | El bloque y el texto de `Classname` (`dark compact`) | Agrega cada nombre válido como clase (separados por espacio, coma o `;`) | La usa `applyBlockOptions`; igual que la anterior, sirve sola |

### Las filas que lee

| Fila / celda | Qué hace |
|---|---|
| `Styles` | Estilos en línea sobre el bloque (y `display: flow-root` en su wrapper para que los márgenes no se colapsen) |
| `Classname` | Clases extra sobre el bloque |
| `Session` | `true` = el bloque y su wrapper solo con sesión; `false` = solo sin sesión (el invitado cuenta como "sin sesión"); vacía = siempre. Lee `store.get('session.isSession')` |
| Estado en la **última columna** de cualquier fila | `login`, `logout`, `guest` (combinables con coma): la fila solo existe para ese estado. Lee `store.get('session')` |

Lo que el autor escribe en la última columna y lo que significa:

| En Drive | Quién la ve | Estado interno |
|---|---|---|
| `login` | Quien inició sesión (`isSession: true`) | `signed-in` |
| `logout` | Quien no tiene sesión ni es invitado | `signed-out` |
| `guest` | El invitado (`isGuest: true`) | `guest` |
| `login, guest` | Cualquiera de los dos | — |

No importan las mayúsculas. Los nombres de antes (`signed-in`, `signed-out`) **se siguen
aceptando**, para que las páginas publicadas no se rompan; en Drive nuevo se usan los de arriba.

No le pregunta a `session.js` por la sesión: la lee del **store** (apartado `session`, que llena
`session.js`). Lo único que usa de `session.js` es la regla del Metadata
(`getSessionData().page.isAccessAllowed`) e `isNavigationPending()` para que la recarga no cancele
una navegación.

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

## 5. `store.js`

**Para qué es:** variables **globales** para todo el sitio, como el estado de React. Cualquier
bloque las guarda y cualquier texto de la página las muestra. `head.html` lo carga en **todas las
páginas**, así que siempre está escuchando.

### 1. Las variables (lo único que puede entrar)

```js
const STORE = {
  // los niveles dinámicos del breadcrumb (los pone el bloque que los conoce, p. ej. product-detail)
  breadcrumb: {
    name: '',   // {store.breadcrumb.name}
    brand: '',  // {store.breadcrumb.brand}
  },
  // el usuario de la sesión: SOLO lo llena session.js; nunca el token
  user: {
    userId: '', firstName: '', lastName: '', fullName: '',
    email: '', phone: '', verified: false, sessionId: '',
    isGuest: false,   // true para el invitado ("Invitado", userId "guest")
  },
  // quién visita: SOLO lo llena session.js
  session: {
    isSession: false, // true SOLO con login real (tiene token); el invitado no es sesión
    isGuest: false,   // true después de "Continuar como invitado"
    token: '',        // 'Bearer …' para las llamadas privadas; '' sin login (privada)
  },
};

// variables que una marca de Drive nunca puede mostrar
const PRIVATE_VARIABLES = ['session.token'];
```

| Quien visita | `isSession` | `isGuest` | `token` |
|---|---|---|---|
| Con login | `true` | `false` | `'Bearer …'` |
| Invitado | `false` | `true` | `''` |
| Nadie | `false` | `false` | `''` |

Solo existe lo que está aquí: lo demás **se rechaza** con un error y no se guarda. Para algo nuevo,
primero se agrega a este objeto. Estos valores también son los que vuelven al **reiniciar**.

### 2. Cuatro funciones, todas con la misma forma

| Función | Una variable | Un bloque | Todo |
|---|---|---|---|
| `store.get()` | `store.get('breadcrumb.name')` | `store.get('breadcrumb')` | `store.get()` |
| `store.set()` | `store.set('breadcrumb.name', 'iPhone')` | `store.set('breadcrumb', { name, brand })` | — |
| `store.reset()` | `store.reset('breadcrumb.name')` | `store.reset('breadcrumb')` | `store.reset()` |
| `store.subscribe()` | `store.subscribe('breadcrumb.name', fn)` | `store.subscribe('breadcrumb', fn)` | `store.subscribe(fn)` |

```js
import { store } from '../../scripts/foundations/store.js';

store.set('breadcrumb.name', product.fullName);   // guardar (product-detail)
store.get('breadcrumb.name');                     // leer: 'Apple iPhone 15 Pro'
store.reset('breadcrumb');                        // dejar el bloque vacío de una vez
store.reset();                                    // dejar todo vacío
```

### 3. Mostrar un valor: no hace falta código

Cualquier texto de la página con una marca **`{store.apartado.variable}`**, en cualquier bloque o
texto de Drive, **se llena solo** y se vuelve a llenar en cada `set` o `reset`:

```
| Level 3      | {store.breadcrumb.name}            |   → "Apple iPhone 15 Pro"
| Title        | Detalle de {store.breadcrumb.name} |   → "Detalle de Apple iPhone 15 Pro"
| Signed In Text | Hola, {store.user.firstName}     |   → "Hola, Cliente"
```

**Dos tipos de marca en Drive** (para saber de dónde viene cada valor):

| Marca | De dónde viene | Quién la llena |
|---|---|---|
| `{store.apartado.variable}` | Del **store** (variables globales) | El store, solo, en cualquier bloque o texto |
| `{variable}` (sin `store.`) | Del **bloque** (datos de su servicio o de su JS) | El JS del bloque: `/celulares/?id={id}`, `{count} productos encontrados` |

El store **solo toca** las marcas que empiezan con `store.`; las del bloque nunca las mira.

- Mientras una marca no tiene valor, su elemento **espera oculto** (`data-store-pending`,
  `styles/foundations/store.css`). El breadcrumb también oculta ese nivel con su `›`.
- Solo cambia **texto**, nunca HTML.
- Los textos de un bloque se llenan **cuando el bloque terminó de cargar**, para que el bloque lea
  su tabla de Drive tal cual.
- Una marca del store que no está declarada (`{store.breadcrumb.price}`) se queda como texto.
- Una marca de una variable **privada** (`{store.session.token}`) **nunca se llena**: su elemento
  se queda oculto y sale un aviso en la consola. El token solo se lee desde JS.

Por eso el breadcrumb no tiene código del store: pinta sus niveles como texto y el store los llena.

### 4. `subscribe`: solo para lógica

Para **mostrar** un valor basta la marca. `subscribe` es para **hacer algo** cuando cambia: mostrar u
ocultar, cambiar una imagen, habilitar un botón… Llama a la función **ahora y cada vez que cambie**,
y devuelve una función para dejar de escuchar.

```js
// ejemplo (cart no existe todavía: habría que declararlo en STORE)
store.subscribe('cart.count', (count) => {
  badge.textContent = count;
  badge.hidden = count === 0;
});
```

### 5. Cuánto duran

Mientras estás en la página. Cada navegación carga la página de nuevo, así que el store **empieza
vacío** y se vuelve a llenar:

- `breadcrumb`: lo llena el bloque que conoce el dato (el detalle del celular pone
  `breadcrumb.name`).
- `user` y `session`: los llena **`session.js` al abrir cada página**, desde la sesión guardada en
  `sessionStorage`. También los actualiza al iniciar sesión o entrar como invitado, y los limpia
  al cerrar sesión o cuando vence (el token queda vacío). Los bloques solo los leen.

### 6. El usuario: solo desde el store

```js
store.get('user');             // { userId, firstName, fullName, email, …, isGuest }
store.get('user.firstName');   // 'Cliente'   ('' sin sesión)
// en Drive: "Hola, {store.user.firstName}"   → se llena solo

// un bloque que pinta HTML con el usuario (Mi cuenta)
store.subscribe('user', (user) => render(user));   // ahora y cada vez que cambie
```

Sin sesión, `user` tiene sus valores vacíos (`userId: ''`). **Nunca** trae el token: el token está
en `session.token` y solo lo usa la llamada privada (`scripts/api/interceptors.js`).

### 7. La sesión: `session`

```js
store.get('session.isSession');   // ¿inició sesión? (el invitado no cuenta)
store.get('session.isGuest');     // ¿es invitado?
store.get('session.token');       // 'Bearer …' — solo para la llamada privada; nunca se pinta ni se imprime

// algo que depende de si hay sesión, ahora y cada vez que cambie
store.subscribe('session.isSession', (isSession) => { button.hidden = !isSession; });
```

Lo usan `block-options.js` (fila `Session` y última columna) y la llamada privada. **Nunca** se
imprime el store completo ni `session` en la consola.

### 8. Ver el store en la consola (solo para depurar)

Al final de `store.js` está `showStoreInConsole()`, con su llamada **comentada**:

```js
// uncomment to see the store in the console; comment it again before pushing
// showStoreInConsole();
```

| Para | Qué hacer |
|---|---|
| Verlo | Descomentar `showStoreInConsole();`: en **todas** las páginas la consola muestra el store |
| Dejar de verlo | Volver a comentar la línea (así se sube al repo) |
| Quitarlo del todo | Borrar lo que está entre `debug: showStoreInConsole (start)` y `(end)`: nada más lo usa |

Qué muestra: al abrir la página (`store · inicio`) y en **cada** cambio (`store · cambió
breadcrumb.name (hora)`), una tabla con **todas** las variables de `STORE`, también las vacías. Lo
que cambió lleva ✏️ y su valor anterior (`antes`). Un apartado nuevo de `STORE` aparece solo. Las
variables privadas salen como `••• (privado)`: el token nunca se imprime.

No la subas descomentada: la consola de la página publicada mostraría los datos del usuario.

---

## 6. `session.js`

**Para qué es:** todo lo de sesión en **un solo archivo**: iniciar y cerrar sesión, el modo
invitado, el estado de quien visita, las reglas de cada página (Metadata `Session` /
`Redirect To`) y mostrar u ocultar elementos según quién visita. **Los datos del usuario los pone en
el store** (`store.get('user')`, ver `store.js`), que es el único lugar de donde los leen los
bloques. No depende de `aem.js`. Guía para
autores y desarrolladores: `documentation/08-sesiones.md`.

### Cómo arranca

`head.html` lo carga en **todas las páginas**, antes de `scripts.js`. Al cargar, una sola vez y
solo:

1. agrega `styles/foundations/sessions.css`;
2. **llena `session` y `user` del store** desde la sesión guardada (el store empieza vacío en cada
   página);
3. pone el estado en `<html>` (`session-state-signed-in`, `-guest`, `-signed-out`, o `-editor` en
   el panel de edición);
4. revisa la regla del Metadata de la página y, si el visitante no puede estar ahí, oculta la
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
| `getSessionData()` | — | El estado de la sesión y de la página en un solo llamado (tabla de abajo) | Saber si hay sesión, si es invitado y la regla de la página. **Los datos del usuario están en el store** |
| `loginUser(endpoint, requestBody)` | La URL del servicio de login y el cuerpo que pide (`{ meta, security, data: { emailOrPhone, password } }`) | `POST` (llamada pública); con un 200 guarda la sesión en `sessionStorage`, llena el usuario del store, avisa a la página y devuelve `getSessionData()`. Si falla lanza el `ApiError` (el JSON del servicio en `error.cause`) | **Iniciar sesión** desde cualquier bloque |
| `logoutUser()` | — | Por ahora borra la sesión y el modo invitado de `sessionStorage`, vacía el usuario del store y avisa a la página. Es `async`, lista para llamar un servicio de logout | **Cerrar sesión** |
| `continueAsGuest()` | — | Guarda un usuario `guest` ("Invitado") con los mismos campos que uno real y su propio `sessionId`, sin token, y lo pone en el store (`isGuest: true`) | El botón "Continuar como invitado" |
| `goToPage(path, { replace })` | Una ruta del sitio | Va a esa página; una recarga pedida por las filas por sesión no la cancela | Navegar después de iniciar sesión o entrar como invitado |
| `showOnlyForSessionStates(element, states)` | Un elemento y los estados (`'signed-in, guest'` o `['signed-in']`) | Le pone las clases de `sessions.css`; sin estados, se ve para todos | Mostrar u ocultar una parte de un bloque, al instante |

| Constante | Valor | Para qué sirve |
|---|---|---|
| `SESSION_CHANGE_EVENT` | `'session:change'` | Evento en `document` después de **cualquier** cambio (iniciar o cerrar sesión, invitado, vencimiento); `detail` = `getSessionData()`. Sirve para volver a pintar sin recargar |
| `SESSION_STATES` | `{ SIGNED_IN: 'signed-in', GUEST: 'guest', SIGNED_OUT: 'signed-out' }` | Comparar estados sin escribir el texto a mano |
| `PAGE_SESSION_RULES` | `{ REQUIRED: 'true', SIGNED_OUT_ONLY: 'false' }` | Comparar `getSessionData().page.rule` |

### Qué trae `getSessionData()`

```js
const { state, isSignedIn, isGuest, page, isEditingToolPreview } = getSessionData();
```

| Propiedad | Qué trae | Sin sesión |
|---|---|---|
| `state` | `'signed-in'`, `'guest'` o `'signed-out'` | `'signed-out'` |
| `isSignedIn` | `true` con una sesión real (el invitado **no** cuenta) | `false` |
| `isGuest` | `true` después de "Continuar como invitado" | `false` |
| `page.rule` | `'true'`, `'false'` o `''` (la fila `Session` del Metadata) | igual |
| `page.redirectPath` | La ruta de `Redirect To`, o `/` | igual |
| `page.isAccessAllowed` | `false` mientras la página está redirigiendo | igual |
| `isEditingToolPreview` | `true` en el panel de edición (no redirige, se ve todo) | igual |

Los datos del usuario **no** están aquí: están en el store (`store.get('user')`). **Nunca** se da
el token. Una sesión vencida cuenta como "sin sesión" (se borra sola).

### Ejemplo: estado de la sesión y datos del usuario

```js
import { SESSION_CHANGE_EVENT, getSessionData } from '../../scripts/foundations/session.js';
import { store } from '../../scripts/foundations/store.js';

// ¿hay sesión? → session.js
const { isSignedIn } = getSessionData();

// los datos del usuario → el store (o la marca {store.user.firstName} en Drive, sin código)
const LABELS = { fullName: 'Nombre', email: 'Correo', phone: 'Teléfono' };
store.subscribe('user', (user) => {
  list.replaceChildren(...Object.keys(LABELS)
    .filter((key) => user[key])
    .map((key) => createElementWithClass('div', 'my-block-field', `${LABELS[key]}: ${user[key]}`)));
});

// repintar algo que depende del estado (no del usuario)
document.addEventListener(SESSION_CHANGE_EVENT, (event) => paintButtons(event.detail));
```

Ejemplos reales: `blocks/account-profile/` (sencillo: Mi cuenta) y `blocks/block-session-example/`
(todo junto).

### Para otros archivos de foundations (no para bloques)

| Función | La usa | Qué hace |
|---|---|---|
| `isNavigationPending()` | `block-options.js` | `true` mientras `goToPage()` está saliendo de la página: la recarga de las filas por sesión espera |
| `clearUserSession()` | `scripts/api/interceptors.js` | Solo borra lo guardado, sin llamar a un servicio (en un 401 el token ya no sirve). Un bloque cierra sesión con `logoutUser()` |

### Funciones internas (no se importan)

| Función | Qué hace |
|---|---|
| `initPageSession()` | El arranque de cada página (CSS, usuario del store, estado, regla); corre sola al cargar el archivo |
| `syncSessionStore()` | Llena `session` (`isSession`, `isGuest`, `token`) y `user` del store desde la sesión guardada (login o invitado), o los vacía sin sesión. Es el **único** que escribe esos dos apartados |
| `applyPageSessionRule()` / `canStayOnPage(rule)` | Aplican la regla `Session` del Metadata y redirigen si hace falta |
| `readPageSessionRule()` / `getPageRedirectPath()` / `readPageMetadataValue(name)` | Leen el Metadata (`page.rule`, `page.redirectPath`) |
| `readLoginSession()` / `readGuestSession()` / `readSessionState()` | Leen lo guardado en `sessionStorage` (la sesión vencida se borra) |
| `storeLoginSession(data)` | Guarda la respuesta 200 del login (la usa `loginUser`) |
| `notifySessionChange()` / `updateSessionStateClass()` | Lanzan `SESSION_CHANGE_EVENT` y cambian la clase de `<html>` |
| `parseSessionStateList(text)` | `'signed-in, guest'` → `['signed-in', 'guest']` (para `showOnlyForSessionStates`) |
| `loadSessionStyles()` / `useStorage()` / `readStoredJson()` / `isEditingToolPreview()` | Cargar `sessions.css`, `sessionStorage` sin errores y detectar el panel de edición |

### Ajustes

Al inicio del archivo, para adaptarlo a otro proyecto:

| Ajuste | Valor hoy | Para qué |
|---|---|---|
| `SESSION_STORAGE_KEY` / `GUEST_STORAGE_KEY` | `novamovil-session` / `novamovil-guest` | Llaves en `sessionStorage` |
| `DEFAULT_REDIRECT_PATH` | `/` | A dónde va una página sin `Redirect To` |
| `GUEST_USER` | `{ userId: 'guest', firstName: 'Invitado', … }` | El usuario que se guarda al continuar como invitado |
| `EDITOR_PREVIEW_HOSTS` | `preview-aemcoder.adobe.io` | Dónde no se redirige y se ve todo |

### Seguridad

- **Ocultar no es proteger:** el HTML y el JavaScript son públicos. Los datos privados solo deben
  llegar del servicio con el token.
- El token nunca va en el código ni en Drive: después del login está en `store.get('session.token')`
  (una marca `{store.session.token}` nunca se llena) y lo usa solo la llamada privada.
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
