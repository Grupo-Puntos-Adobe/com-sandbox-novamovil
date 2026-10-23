# 08 · Sesiones: páginas privadas, contenido por sesión y llamadas con token

Esta guía explica **cómo se usa la sesión** en el sitio: qué escribe el autor en Drive, qué usa
quien programa un bloque y qué archivos llevarse a otro proyecto.

---

## 1. En corto

| Quiero… | Dónde | Qué escribo |
|---|---|---|
| Que una **página** solo se vea **con** sesión | Metadata de la página | `Session` \| `true` |
| Que una página solo se vea **sin** sesión (login) | Metadata de la página | `Session` \| `false` |
| Que una página sea **pública** | Metadata | Sin la fila `Session` (o vacía) |
| Elegir **a dónde** mandar (en los dos casos) | Metadata | `Redirect To` \| `/login` (sin la fila o vacía: al home `/`) |
| Que un **bloque** solo se vea **con** sesión (sin redirigir) | Tabla del bloque | `Session` \| `true` |
| Que un bloque solo se vea **sin** sesión (p. ej. "Iniciar sesión") | Tabla del bloque | `Session` \| `false` |
| Que un bloque se vea **siempre** | Tabla del bloque | Sin la fila `Session` (o vacía) |
| Que una **fila** de la tabla (un valor) dependa de la sesión | Tabla del bloque | El estado en la **última columna**: `Title` \| `Hola, cliente` \| `signed-in` |
| Que una fila la vean dos estados | Tabla del bloque | Última columna: `signed-out, guest` |
| Mostrar u ocultar **una parte** de un bloque | Código del bloque | `setSessionVisibility(elemento, 'signed-in')` |
| Pintar **datos del usuario** ("Hola, Cliente") | Código del bloque | `renderForSession(elemento, { 'signed-in': … })` |
| Llamar un **servicio privado** con el token | Tabla del bloque + código | Fila `Private Endpoint` (`Endpoint` es para los públicos) y `post(readPrivateEndpoint(block), body, { interceptor: REQUEST_TYPE.PRIVATE })` |
| Que el **login** mande a "Mi cuenta" al tener sesión | Metadata de `login` | `Session` \| `false` + `Redirect To` \| `/cuenta` |
| Que el login **no** redirija (paso de compra) | Metadata del paso | Sin la fila `Session` |

Ejemplo de todo junto: `blocks/block-session-example/` y la página `content-drive/ejemplo-sesion.docx`.

## 2. Los tres estados

| Estado | Cuándo | Clase en `<html>` |
|---|---|---|
| `signed-in` | Hay sesión vigente (login 200 y no venció `expiresIn`) | `session-state-signed-in` |
| `guest` | Eligió "Continuar como invitado" (sin token) | `session-state-guest` |
| `signed-out` | Ninguno (o la sesión venció) | `session-state-signed-out` |

En el panel de edición la clase es `session-state-editor`: se ve todo y no hay redirecciones, para
poder editar las páginas privadas.

Cada regla mira la sesión a su manera:

| Regla | ¿Cuenta el invitado? |
|---|---|
| Metadata de la página (`Session` `true` / `false`) | No: el invitado es "sin sesión" |
| Fila `Session` del bloque (`true` / `false`) | No: el invitado es "sin sesión" |
| Estado en la última columna de una fila | Sí: `guest` es un estado propio (se combina con coma) |

## 3. Archivos

| Archivo | Qué tiene | ¿Portable? |
|---|---|---|
| `scripts/foundations/session.js` | **El único archivo de sesión y el punto de entrada**: lo carga `head.html` en todas las páginas. Toda la lógica: datos (parte 1), páginas y redirecciones (parte 2), mostrar y pintar (parte 3) y el arranque (`startPageSession`). No importa `aem.js` | Sí |
| `styles/foundations/sessions.css` | Solo las clases que ocultan lo que no toca (`session-only-*`); lo carga `session.js` | Sí |
| `scripts/foundations/block-options.js` | En cada bloque: las filas por sesión (última columna) y la fila `Session`. Solo le pregunta a `session.js` por la sesión si el bloque trae esos campos | Sí |
| `scripts/api/interceptors.js` | `REQUEST_TYPE.PUBLIC` y `REQUEST_TYPE.PRIVATE` (con Bearer) | Lleva la configuración de la API del proyecto |
| `blocks/login/` | Inicio de sesión (guarda la sesión con `signIn`) | Bloque del sitio |
| `blocks/block-session-example/` | Ejemplo de todo | Ejemplo para copiar |

`head.html` lleva **una sola línea** para la sesión, antes de `scripts.js`:

```html
<script nonce="aem" src="/scripts/foundations/session.js" type="module"></script>
```

`scripts/aem.js`, `scripts.js` y `404.html` **no se tocan**: quedan como el template original.

## 4. Cómo arranca

Todo empieza en `head.html`, en **todas las páginas**, tengan bloques o no:

```
head.html carga session.js (antes de scripts.js; una vez por página)
  └─ startPageSession()
       ├─ agrega sessions.css
       ├─ pone el estado en <html> (session-state-…)
       └─ guardPage()  → Metadata Session / Redirect To
            ├─ sin la fila Session (o vacía): no hace nada
            └─ si no acepta al visitante: oculta la página y redirige
scripts.js → decorate(block) de cada bloque
  └─ applyBlockOptions(block)            (solo bloques del proyecto)
       ├─ la página redirige → el bloque se vacía (isPageAccepted)
       ├─ applySessionRows(block)  → solo si hay filas con estado en la última columna
       └─ Styles / Classname / Session (true | false)
```

El navegador corre los módulos de `head.html` en orden, así que la regla se revisa **antes** de
`scripts.js` y la página sigue oculta hasta que `scripts.js` la muestra: una página que redirige no
llega a verse. Un módulo se carga una sola vez: cuando `block-options.js`, el login o los
interceptores importan `session.js`, el arranque ya corrió y no se repite.

Una página **sin** bloques del proyecto (solo texto, como `cuenta` o `perfil`) también revisa su
regla.

## 5. Páginas: todo se controla en el Metadata

```
┌─────────────┬───────────────────────┐
│ Metadata    │                       │
├─────────────┼───────────────────────┤
│ Title       │ Mi cuenta | NovaMóvil │
│ Session     │ true                  │  ← true | false | (sin la fila = pública)
│ Redirect To │ /login                │  ← a dónde mandar; sin la fila o vacía: al home /
└─────────────┴───────────────────────┘
```

| `Session` | Sin sesión (o invitado) | Con sesión | Ejemplo |
|---|---|---|---|
| `true` | Va a `Redirect To` | Se ve | `cuenta` / `perfil` (`Redirect To: /login`) |
| `false` | Se ve | Va a `Redirect To` | `login` (`Redirect To: /cuenta`) |
| sin la fila o vacía | Se ve | Se ve | Home, celulares, detalle… (públicas: no se revisa nada) |

- `Redirect To` sirve para `true` y para `false`; si no viene o está vacía, manda al home `/`.
  **Nada se agrega a la URL.**
- No importan mayúsculas (`TRUE` = `true`).
- La redirección usa `location.replace(…)`, así "atrás" no regresa a la página.
- La regla se vuelve a revisar al cambiar la sesión en la página: al iniciar sesión en `login`
  (`false`) va a `Redirect To`; al cerrar sesión en una página `true` va a `Redirect To`.
- Es **global**: los bloques no tienen que hacer nada (solo existir en la página, ver sección 4).

## 6. Bloques, filas y partes según la sesión

### 6.1 Una fila de la tabla (Drive): el estado en la última columna

El estado va en la **última columna** de la fila, tenga 2 o más columnas. Funciona en **todos los
bloques del proyecto** (los que llaman `applyBlockOptions`, también dentro de fragmentos), sin
cambiar su código; los bloques del template (`columns`, `cards`…) no lo usan:

```
┌──────────────┬──────────────────────────┬──────────────────┐
│ Card Promotions                                              │
├──────────────┼──────────────────────────┼──────────────────┤
│ Title        │ Promociones              │ signed-out       │  ← solo sin sesión
│ Title        │ Tus promociones, cliente │ signed-in        │  ← solo con sesión
│ Benefit 1    │ 🚚 │ Envío gratis         │ guest, signed-out│  ← 2 valores y 2 estados
│ Endpoint     │ https://…                │                  │  ← vacía: siempre se ve
└──────────────┴──────────────────────────┴──────────────────┘
```

| Última columna | La fila existe para |
|---|---|
| `signed-in` | Quien tiene sesión |
| `signed-out` | Quien no tiene sesión |
| `guest` | El invitado |
| varios con coma (`signed-in, guest`) | Cualquiera de ellos |
| vacía | Todos |
| texto que no es **solo** estados ("guest y otra palabra") | Todos (no cuenta como estado) |

- Las filas de otros estados se quitan **antes** de que el bloque lea su tabla, y a la que queda se
  le quita la celda del estado. El bloque lee `Title` como siempre: **no hay que cambiar su
  código**.
- Lo hace `applySessionRows(block)`, que llama `applyBlockOptions` antes de leer la tabla.
- Cuando la sesión cambia en la misma página (iniciar sesión, invitado, cerrar sesión), la página se
  **recarga** para mostrar las filas del nuevo estado. Si en ese momento se navega a otra página con
  `navigateTo()` (por ejemplo la regla de la página), no se recarga.
- Ejemplo real: el breadcrumb con `Level 2 | Visitante | signed-out` y `Level 2 | Mi cuenta |
  signed-in` muestra uno u otro sin tocar `breadcrumb.js`.

### 6.2 Un bloque completo (Drive): la fila `Session`

Cualquier bloque que use `applyBlockOptions` acepta la fila **`Session`**:

```
│ Card Promotions │                    │
│ Session         │ true               │  ← true | false | (sin la fila = siempre)
```

| `Session` | Sin sesión (o invitado) | Con sesión |
|---|---|---|
| `true` | Oculto | Se ve |
| `false` | Se ve | Oculto (p. ej. el botón "Iniciar sesión") |
| sin la fila o vacía | Se ve | Se ve |

- Solo importa si **hay sesión o no**: el invitado cuenta como "sin sesión".
- El bloque **y su wrapper** se ocultan, para no dejar espacio vacío. Nunca redirige (eso es del
  Metadata de la página).
- Cambia **al instante**, sin recargar (lo hacen las clases de `sessions.css`).

### 6.3 Una parte de un bloque (código)

```js
import {
  SESSION_STATES, renderForSession, setSessionVisibility,
} from '../../scripts/foundations/session.js';

// se oculta / aparece sola al cambiar la sesión (clases de sessions.css)
setSessionVisibility(couponCard, 'signed-in, guest');

// contenido que depende del usuario: se vuelve a pintar al cambiar la sesión
renderForSession(greeting, {
  [SESSION_STATES.SIGNED_IN]: (session) => `Hola, ${session.user.firstName}`,
  [SESSION_STATES.SIGNED_OUT]: () => 'Inicia sesión para ver tus cupones',
  // sin vista de guest usa la de signed-out
});
```

O sin JS, directo con clases:

```html
<div class="session-only session-only-signed-in session-only-guest">…</div>
```

## 7. El bloque `login`

El bloque **no redirige**: solo inicia sesión y se oculta al tener sesión. A dónde ir lo decide el
Metadata de la página:

| Dónde está el login | Metadata de la página | Resultado |
|---|---|---|
| Página `login` | `Session: false` · `Redirect To: /cuenta` | Con sesión (al abrir o al iniciar sesión) va a `/cuenta`. El invitado ve el formulario y puede iniciar sesión |
| Paso **Datos** de la compra | sin `Session` | No redirige: al iniciar sesión o como invitado el login se oculta y el paso queda cumplido |

"Continuar como invitado" llama `continueAsGuest()` y va al enlace de la fila `Guest Button`; sin
enlace se queda (paso cumplido). Más detalle en `blocks/login/README.md`.

## 8. Llamadas a servicios

En la tabla del bloque: **`Endpoint`** = servicio público, **`Private Endpoint`** (o
`PrivateEndpoint`) = servicio privado. Los bloques que ya existen siguen con `Endpoint`.

| Tipo | Uso | Qué hace |
|---|---|---|
| `REQUEST_TYPE.PUBLIC` (por defecto) | `get(url)` / `post(url, body)` | Llamada simple, sin sesión. Los errores conservan el JSON del servicio en `error.cause` |
| `REQUEST_TYPE.PRIVATE` | `post(url, body, { interceptor: REQUEST_TYPE.PRIVATE })` | Manda `Authorization: Bearer …` y el mismo valor en `security.auth.value`. Sin sesión no llama. Con un 401: `signOut()` y va a `Redirect To` de la página (o al home) |

Guía de la API: `documentation/07-integracion-endpoints.md`.

## 9. Funciones de `session.js`

| Parte | Función | Para |
|---|---|---|
| 1 | `signIn(data)` / `signOut()` / `continueAsGuest()` | Cambiar el estado (disparan `SESSION_CHANGE_EVENT`) |
| 1 | `getAccessState()` | `'signed-in'`, `'guest'` o `'signed-out'` |
| 1 | `getSession()` / `isSignedIn()` / `getAccessToken()` | Usuario, ¿hay sesión?, `'Bearer …'` |
| 0 | `startPageSession()` | Arranque en cada página: `sessions.css`, estado y `guardPage()` (corre sola al cargar `session.js`) |
| 0 | `isPageAccepted()` | `false` mientras la página redirige (los bloques no pintan nada) |
| 2 | `guardPage()` | Regla de la página (la llama `startPageSession()` una vez) |
| 2 | `requireSession({ allowGuest, redirectTo })` | La regla `true` para un bloque que debe redirigir por sí mismo |
| 2 | `requireNoSession({ redirectTo })` | La regla `false` |
| 2 | `getPageSessionRule()` | El valor de `Session` de la página: `'true'`, `'false'` o `''` |
| 2 | `getSessionRedirectUrl()` / `toSitePath()` | Ruta de `Redirect To` (o `/`) y rutas validadas (solo del sitio) |
| 2 | `navigateTo(path, { replace })` | Ir a otra página sin que la recarga de las filas la cancele |
| 2 | `isEditorPreview()` | `true` en el panel de edición (no redirige, se ve todo) |
| 3 | `applySessionRows(block)` | Filas con el estado en la última columna (la llama `applyBlockOptions`) |
| 3 | `setSessionVisibility(el, states)` / `parseSessionStates(text)` | Mostrar u ocultar |
| 3 | `renderForSession(target, views)` | Pintar según el estado |

Referencia completa de funciones y ajustes: `scripts/foundations/README.md` (sección `session.js`).

## 10. Casos probados

| # | Caso | Resultado |
|---|---|---|
| 1 | Página pública sin reglas | Igual que antes |
| 2 | Página `Session: true` + `Redirect To: /login`, sin sesión | Va a `/login` |
| 2b | `Session: true` sin `Redirect To` o vacía | Va al home `/` |
| 2c | `Session: false` sin `Redirect To`, con sesión | Va al home `/` |
| 2d | Sin la fila `Session` o vacía | La página se ve siempre |
| 2e | Página `Session: true` solo con texto (`cuenta`, `perfil`), sin sesión | Va a `/login`: la regla corre aunque no haya bloques |
| 3 | Página `Session: true` como invitado | Redirige (el invitado no cuenta como sesión) |
| 4 | Cerrar sesión en una página `Session: true` | Redirige |
| 5 | `/login` (`Session: false`) ya con sesión, o al iniciar sesión | Va a `/cuenta` |
| 5b | Invitado en `/login` | Ve el formulario |
| 6 | Login en un paso de compra (sin `Session`) | Al iniciar sesión o como invitado se oculta y aparece lo `signed-in, guest`, sin recargar |
| 7 | Ejemplo sin sesión | Filas `signed-out` y "para todos"; bloque `Session: true` oculto, `Session: false` visible |
| 8 | Invitado / cerrar sesión en el ejemplo | Los bloques `Session` cambian al instante; la página se recarga y muestra las filas del nuevo estado |
| 9 | Breadcrumb con `Level 2` por estado (última columna) | Muestra "Visitante", "Invitado" o "Mi cuenta" sin cambiar su código |
| 10 | Última columna con "guest y otra palabra" | No cuenta como estado: la fila se ve siempre |
| 11 | `Redirect To` = `//otro.com` o `javascript:` | Se ignora: va al home |
| 12 | Sesión vencida | Cuenta como `signed-out` |
| 13 | Llamada privada sin sesión | No llama al servicio y va a `Redirect To` (o al home) |
| 14 | Llamada privada con sesión | Header `Authorization: Bearer …` y `security.auth.value` iguales |
| 15 | Home, celulares, detalle | Igual que antes |

## 11. Seguridad

- **Ocultar no es proteger.** El HTML y el JavaScript son públicos: lo oculto sigue en la página.
  Los datos privados solo deben llegar del servicio con `REQUEST_TYPE.PRIVATE`.
- El token **nunca** va en el código ni en Drive: sale de `getAccessToken()` después del login.
- Nada viaja por la URL. Las rutas de las tablas solo aceptan **rutas del sitio** (nada de
  `//otro.com` ni `javascript:`).
- La sesión vive en `sessionStorage` (se borra al cerrar la pestaña) y vence con `expiresIn`.
- Nunca se escribe la sesión en `console`.

## 12. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La página privada no redirige | Falta la línea de `session.js` en `head.html`, o la fila `Session` no dice `true` / `false` | Revisar `head.html` y el Metadata |
| Redirige al home y no a donde quería | `Redirect To` falta, está vacía o no es una ruta del sitio | Escribir una ruta como `/login` |
| `Session` del bloque no hace nada | El valor no es `true` ni `false` | Escribir `true` o `false` |
| Una fila por sesión siempre se ve | El estado no está en la **última** columna o trae más texto | Dejar en la última celda solo `signed-in`, `signed-out` o `guest` |
| En el panel de edición se ve todo | Es a propósito (`session-state-editor`) | Probar en la vista previa del sitio |

## 13. Llevarlo a otro proyecto

1. Copia `scripts/foundations/session.js` y `block-utils.js` (con `messages.js`), y
   `styles/foundations/sessions.css`. Para las filas por sesión de los bloques, también
   `block-options.js`.
2. Agrega a `head.html`, antes de `scripts.js`:
   `<script nonce="aem" src="/scripts/foundations/session.js" type="module"></script>`.
   Con eso todas las páginas revisan su regla de Metadata. No se toca `scripts.js` ni `aem.js`.
3. Ajusta los ajustes de arriba de `session.js`: `DEFAULT_SESSION_REDIRECT`, las llaves de
   `sessionStorage` y `EDITOR_PREVIEW_HOSTS`.
4. Para llamadas privadas, copia `privateRequestInterceptor` de `scripts/api/interceptors.js`.
