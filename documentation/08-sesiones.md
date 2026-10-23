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
| Que una **fila** de la tabla (un valor) solo se vea con sesión | Tabla del bloque | El estado en la **última celda**: `Title` \| `Hola, cliente` \| `signed-in` |
| Mostrar u ocultar **una parte** de un bloque | Código del bloque | `setSessionVisibility(elemento, 'signed-in')` |
| Pintar **datos del usuario** ("Hola, Cliente") | Código del bloque | `renderForSession(elemento, { 'signed-in': … })` |
| Llamar un **servicio privado** con el token | Código del bloque | `post(url, body, { interceptor: REQUEST_TYPE.PRIVATE })` |
| Que el **login** mande a "Mi cuenta" al tener sesión | Metadata de `login` | `Session` \| `false` + `Redirect To` \| `/cuenta` |
| Que el login **no** redirija (paso de compra) | Metadata del paso | Sin la fila `Session` |

Ejemplo de todo junto: `blocks/block-session-example/` y la página `content-drive/ejemplo-sesion.docx`.

## 2. Los tres estados

| Estado | Cuándo | Clase en `<html>` |
|---|---|---|
| `signed-in` | Hay sesión vigente (login 200) | `session-state-signed-in` |
| `guest` | Eligió "Continuar como invitado" | `session-state-guest` |
| `signed-out` | Ninguno (o la sesión venció) | `session-state-signed-out` |

En el panel de edición la clase es `session-state-editor`: se ve todo y no hay redirecciones, para
poder editar las páginas privadas.

Se pueden combinar con coma: `signed-in, guest` = con sesión **o** invitado. Vacío = todos.

## 3. Archivos

| Archivo | Qué tiene | ¿Portable? |
|---|---|---|
| `scripts/foundations/session.js` | Toda la lógica: datos (parte 1), páginas y redirecciones (parte 2), mostrar y pintar (parte 3) | Sí |
| `styles/foundations/sessions.css` | Solo las clases que ocultan lo que no toca (`session-only-*`) | Sí |
| `scripts/foundations/block-options.js` | **Punto de entrada**: carga `sessions.css`, aplica la regla de la página (Metadata) y, en cada bloque, las filas por sesión y la fila `Session` | Sí |
| `scripts/api/interceptors.js` | `REQUEST_TYPE.PUBLIC` y `REQUEST_TYPE.PRIVATE` (con Bearer) | Lleva la configuración de la API del proyecto |

`scripts.js`, `head.html` y `404.html` **no se tocan**: todo arranca desde `block-options.js`, en
cuanto el primer bloque del proyecto (los que llaman `applyBlockOptions`) carga en la página.

> Una página **sin** bloques del proyecto (solo texto) no carga `block-options.js`: su regla de
> `Session` no corre y la página siempre se muestra.
| `blocks/login/` | Inicio de sesión (guarda la sesión con `signIn`) | Bloque del sitio |
| `blocks/block-session-example/` | Ejemplo de todo | Ejemplo para copiar |

## 4. Páginas: todo se controla en el Metadata

```
┌─────────────┬───────────────────────┐
│ Metadata    │                       │
├─────────────┼───────────────────────┤
│ Title       │ Mi cuenta | NovaMóvil │
│ Session     │ true                  │  ← true | false | (sin la fila = pública)
│ Redirect To │ /login                │  ← a dónde mandar; sin la fila o vacía: al home /
└─────────────┴───────────────────────┘
```

| `Session` | Sin sesión | Con sesión | Ejemplo |
|---|---|---|---|
| `true` | Va a `Redirect To` | Se ve | `cuenta` (`Redirect To: /login`), `perfil` |
| `false` | Se ve | Va a `Redirect To` | `login` (`Redirect To: /cuenta`) |
| sin la fila o vacía | Se ve | Se ve | Home, celulares, detalle… (públicas: no se revisa nada) |

- `Redirect To` sirve para `true` y para `false`; si no viene o está vacía, manda al home `/`.
  Nada se agrega a la URL.
- No importan mayúsculas (`TRUE` = `true`). El invitado **no** cuenta como sesión.
- La página que no acepta al visitante **no se pinta**: `block-options.js` llama `guardPage()` al
  cargar el primer bloque del proyecto (antes de que se muestre su sección), oculta la página y hace
  `location.replace(…)`, así "atrás" no regresa a ella.
- Solo corre en páginas con al menos un bloque del proyecto (`hero-novamovil`, `card-*`,
  `breadcrumb`, `login`, `product-*`, `block-session-example`…).
- La regla se vuelve a revisar al cambiar la sesión en la página: al iniciar sesión en `login`
  (`false`) va a `Redirect To`; al cerrar sesión en `cuenta` (`true`) va a `Redirect To`.
- Es **global**: los bloques no tienen que hacer nada.

## 5. Bloques, filas y partes según la sesión

### 5.1 Una fila de la tabla (Drive) — funciona en cualquier bloque

El estado va en la **última celda** de la fila, tenga 2 o más columnas. Funciona en **todos los
bloques del proyecto** (los que llaman `applyBlockOptions`, también dentro de fragmentos), sin
cambiar su código; los bloques del template (`columns`, `cards`…) no lo usan:

```
┌──────────────┬──────────────────────────┬──────────────┐
│ Card Promotions                                          │
├──────────────┼──────────────────────────┼──────────────┤
│ Title        │ Promociones              │ signed-out   │  ← solo sin sesión
│ Title        │ Tus promociones, cliente │ signed-in    │  ← solo con sesión
│ Benefit 1    │ 🚚 │ Envío gratis         │ guest        │  ← 2 valores: el estado sigue al final
│ Endpoint     │ https://…                │              │  ← vacía: siempre se ve
└──────────────┴──────────────────────────┴──────────────┘
```

- Si la última celda dice **solo** `signed-in`, `signed-out` o `guest` (o varios con coma, p. ej.
  `guest, signed-out`), la fila solo queda
  para ese estado; las de otros estados se quitan **antes** de que el bloque lea su tabla, y a la
  que queda se le quita la celda del estado. El bloque lee `Title` como siempre: **no hay que
  cambiar su código**.
- Si la última celda está vacía o no es un estado, la fila **siempre se muestra**.
- Si la última celda trae otra cosa además del estado ("guest y otra palabra"), no cuenta: la fila
  se ve siempre.
- Lo hace `applySessionRows(block)`, que llama `applyBlockOptions` antes de leer la tabla.
- Cuando la sesión cambia en la misma página (iniciar sesión, invitado, cerrar sesión), la página se
  **recarga** para mostrar las filas del nuevo estado. Si en ese momento se navega a otra página con
  `navigateTo()` (por ejemplo el login), no se recarga.
- Ejemplo real: el breadcrumb con `Level 2 | Visitante | signed-out` y `Level 2 | Mi cuenta |
  signed-in` muestra uno u otro sin tocar `breadcrumb.js`.

### 5.2 Un bloque completo (Drive)

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
- Cambia al instante al iniciar o cerrar sesión, sin recargar.

### 5.3 Una parte de un bloque (código)

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

## 6. El bloque `login`

El bloque **no redirige**: solo inicia sesión y se oculta al tener sesión. A dónde ir lo decide el
Metadata de la página:

| Dónde está el login | Metadata de la página | Resultado |
|---|---|---|
| Página `login` | `Session: false` · `Redirect To: /cuenta` | Con sesión (al abrir o al iniciar sesión) va a `/cuenta`. El invitado ve el formulario |
| Paso **Datos** de la compra | sin `Session` | No redirige: al iniciar sesión o como invitado el login se oculta y el paso queda cumplido |

## 7. Funciones de `session.js`

| Parte | Función | Para |
|---|---|---|
| 1 | `signIn(data)` / `signOut()` / `continueAsGuest()` | Cambiar el estado (disparan `SESSION_CHANGE_EVENT`) |
| 1 | `getAccessState()` | `'signed-in'`, `'guest'` o `'signed-out'` |
| 1 | `getSession()` / `isSignedIn()` / `getAccessToken()` | Usuario, ¿hay sesión?, `'Bearer …'` |
| 2 | `guardPage()` | Regla de la página (la llama `block-options.js` una vez) |
| 2 | `requireSession({ allowGuest, redirectTo })` | Un bloque que debe redirigir por sí mismo |
| 2 | `getSessionRedirectUrl()` / `toSitePath()` | Ruta de `Redirect To` (o `/`) y rutas validadas (solo del sitio) |
| 2 | `requireNoSession()` / `getPageSessionRule()` | La regla `false` / el valor de `Session` de la página |
| 2 | `navigateTo(path, { replace })` | Ir a otra página sin que la recarga de las filas la cancele |
| 3 | `applySessionRows(block)` | Filas con el estado en la última celda (la llama `applyBlockOptions`) |
| 3 | `setSessionVisibility(el, states)` / `parseSessionStates(text)` | Mostrar u ocultar |
| 3 | `renderForSession(target, views)` | Pintar según el estado |

## 8. Casos probados

| # | Caso | Resultado |
|---|---|---|
| 1 | Página pública sin reglas | Igual que antes |
| 2 | `cuenta` / `perfil` (`Session: true`, `Redirect To: /login`) sin sesión | Va a `/login` |
| 2b | `Session: true` sin `Redirect To` o vacía | Va al home `/` |
| 2c | `Session: false` sin `Redirect To`, con sesión | Va al home `/` |
| 2d | Sin la fila `Session` o vacía | La página se ve siempre |
| 3 | Login correcto desde ahí | Regresa a `/perfil` |
| 4 | `/perfil` como invitado | Va al login (el invitado no alcanza) |
| 5 | Ejemplo sin sesión | Se ven las filas `signed-out` y "para todos"; el bloque `signed-in` oculto |
| 6 | Invitado / cerrar sesión en el ejemplo | La página se recarga y muestra las filas del nuevo estado |
| 6b | Breadcrumb con `Level 2` por estado (última celda) | Muestra "Visitante", "Invitado" o "Mi cuenta" sin cambiar su código |
| 7 | Cerrar sesión en una página `Session: true` | Redirige |
| 8 | `/login` (`Session: false`) ya con sesión, o al iniciar sesión | Va a `/cuenta` |
| 8b | Invitado en `/login` | Ve el formulario |
| 9 | Login en un paso de compra (sin `Session`) | Al iniciar sesión o como invitado se oculta y aparece lo `signed-in, guest`, sin recargar |
| 10 | `Redirect To` = `//otro.com` o `javascript:` | Se ignora: va al home |
| 11 | Sesión vencida | Cuenta como `signed-out` |
| 12 | Llamada privada sin sesión | No llama al servicio y redirige al login |
| 13 | Llamada privada con sesión | Header `Authorization: Bearer …` y `security.auth.value` iguales |
| 14 | Home, celulares, detalle | Igual que antes |

## 9. Seguridad

- **Ocultar no es proteger.** El HTML y el JavaScript son públicos: lo oculto sigue en la página.
  Los datos privados solo deben llegar del servicio con `REQUEST_TYPE.PRIVATE`.
- El token **nunca** va en el código ni en Drive: sale de `getAccessToken()` después del login.
- Nada viaja por la URL. Las rutas de las tablas solo aceptan **rutas del sitio** (nada de
  `//otro.com` ni `javascript:`).
- La sesión vive en `sessionStorage` (se borra al cerrar la pestaña) y vence con `expiresIn`.
- Nunca se escribe la sesión en `console`.

## 10. Llevarlo a otro proyecto

1. Copia `scripts/foundations/session.js`, `block-utils.js`, `block-options.js` y
   `styles/foundations/sessions.css`.
2. Nada más: no se toca `scripts.js` ni `head.html`. Los bloques llaman `applyBlockOptions(block)`
   al inicio de su `decorate()` y con eso cargan `sessions.css`, la regla de la página y las filas
   por sesión.
3. Ajusta los ajustes de arriba de `session.js`: `DEFAULT_SESSION_REDIRECT`, las llaves de
   `sessionStorage` y `EDITOR_PREVIEW_HOSTS`.
4. Para llamadas privadas, copia `privateRequestInterceptor` de `scripts/api/interceptors.js`.
