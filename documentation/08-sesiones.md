# 08 · Sesiones: páginas privadas, contenido por sesión y llamadas con token

Esta guía explica **cómo se usa la sesión** en el sitio: qué escribe el autor en Drive, qué usa
quien programa un bloque y qué archivos llevarse a otro proyecto.

---

## 1. En corto

| Quiero… | Dónde | Qué escribo |
|---|---|---|
| Que una **página** solo se vea con sesión | Metadata de la página | `Session` \| `true` (`false`, vacía o sin la fila = pública) |
| Elegir **a dónde** mandar a quien no tiene sesión | Metadata | `Redirect With Session` \| `/login` (sin la fila: al home `/`) |
| Que un **bloque** solo se vea con sesión (sin redirigir) | Tabla del bloque | `Session` \| `signed-in` |
| Que un bloque solo se vea **sin** sesión | Tabla del bloque | `Session` \| `signed-out` |
| Que una **fila** de la tabla (un valor) solo se vea con sesión | Tabla del bloque | El estado en la **última celda**: `Title` \| `Hola, cliente` \| `signed-in` |
| Mostrar u ocultar **una parte** de un bloque | Código del bloque | `setSessionVisibility(elemento, 'signed-in')` |
| Pintar **datos del usuario** ("Hola, Cliente") | Código del bloque | `renderForSession(elemento, { 'signed-in': … })` |
| Llamar un **servicio privado** con el token | Código del bloque | `post(url, body, { interceptor: REQUEST_TYPE.PRIVATE })` |
| Que el **login** redirija al tener sesión | Tabla Login | `Redirect With Session` \| `/perfil` |
| Que el login **no** redirija (paso de compra) | Tabla Login | Sin `Redirect With Session` (o vacía) |

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
| `scripts/foundations/block-options.js` | Fila `Session` de cualquier bloque | Sí |
| `scripts/api/interceptors.js` | `REQUEST_TYPE.PUBLIC` y `REQUEST_TYPE.PRIVATE` (con Bearer) | Lleva la configuración de la API del proyecto |
| `scripts/scripts.js` | `guardPage()` antes de pintar la página | Una línea en `loadEager` |
| `head.html` | `<link>` a `sessions.css` | Una línea |
| `blocks/login/` | Inicio de sesión (guarda la sesión con `signIn`) | Bloque del sitio |
| `blocks/block-session-example/` | Ejemplo de todo | Ejemplo para copiar |

## 4. Páginas que piden sesión (Metadata)

```
┌───────────────────────┬───────────────────────┐
│ Metadata              │                       │
├───────────────────────┼───────────────────────┤
│ Title                 │ Mi perfil | NovaMóvil │
│ Session               │ true                  │  ← true | false (vacía o sin la fila = false)
│ Redirect With Session │ /login                │  ← opcional; sin la fila: al home /
└───────────────────────┴───────────────────────┘
```

| `Session` | `Redirect With Session` | Sin sesión | Con sesión |
|---|---|---|---|
| `true` | `/login` | Va a `/login?redirect=%2Fperfil` (el login regresa aquí) | Se ve |
| `true` | sin la fila o vacía | Va al home `/` | Se ve |
| `false`, vacía o sin la fila | — | Se ve (página pública) | Se ve |

- Solo `true` protege la página (no importan mayúsculas). El invitado **no** cuenta como sesión.
- Sin sesión, la página **no se pinta**: `scripts.js` llama `guardPage()` antes de decorar y hace
  `location.replace(…)`. Así "atrás" no regresa a la página privada.
- Si el visitante cierra sesión estando en la página, se redirige al momento.
- Es **global**: los bloques no tienen que hacer nada para proteger la página.

## 5. Bloques, filas y partes según la sesión

### 5.1 Una fila de la tabla (Drive) — funciona en cualquier bloque

El estado va en la **última celda** de la fila, tenga uno o varios valores:

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

- Si la última celda dice `signed-in`, `signed-out` o `guest` (o varios con coma), la fila solo queda
  para ese estado; las de otros estados se quitan **antes** de que el bloque lea su tabla, y a la
  que queda se le quita la celda del estado. El bloque lee `Title` como siempre: **no hay que
  cambiar su código**.
- Si la última celda está vacía o no es un estado, la fila **siempre se muestra**.
- Una fila de solo `llave | valor` nunca se toca (el valor no se confunde con un estado).
- Lo hace `applySessionRows(block)`, que llama `applyBlockOptions` al inicio de cada bloque.
- Cuando la sesión cambia en la misma página (iniciar sesión, invitado, cerrar sesión), la página se
  **recarga** para mostrar las filas del nuevo estado. Si en ese momento se navega a otra página con
  `navigateTo()` (por ejemplo el login), no se recarga.
- Ejemplo real: el breadcrumb con `Level 2 | Visitante | signed-out` y `Level 2 | Mi cuenta |
  signed-in` muestra uno u otro sin tocar `breadcrumb.js`.

### 5.2 Un bloque completo (Drive)

Cualquier bloque que use `applyBlockOptions` acepta la fila **`Session`**:

```
│ Card Promotions │                    │
│ Session         │ signed-in          │  ← solo con sesión (la página no redirige)
```

El bloque **y su wrapper** se ocultan, para no dejar espacio vacío.

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

| Fila | Valor | Qué hace |
|---|---|---|
| `Redirect With Session` | `/perfil` | Con sesión, siempre va ahí (sin mostrar el formulario) |
| | vacía o sin la fila | **Modo paso**: no redirige; el login solo se ve sin sesión y se oculta al iniciar sesión o entrar como invitado |
| `Return To Previous Page` | `yes` | Un `?redirect=` válido gana a `Redirect With Session` |

Cada página tiene su propia tabla Login: en `/login` va `Redirect With Session` = `/perfil`; en el
paso **Datos** de la compra va sin esa fila, y el login solo se oculta.

## 7. Funciones de `session.js`

| Parte | Función | Para |
|---|---|---|
| 1 | `signIn(data)` / `signOut()` / `continueAsGuest()` | Cambiar el estado (disparan `SESSION_CHANGE_EVENT`) |
| 1 | `getAccessState()` | `'signed-in'`, `'guest'` o `'signed-out'` |
| 1 | `getSession()` / `isSignedIn()` / `getAccessToken()` | Usuario, ¿hay sesión?, `'Bearer …'` |
| 2 | `guardPage()` | Regla de la página (la llama `scripts.js`) |
| 2 | `requireSession({ allowGuest, redirectTo })` | Un bloque que debe redirigir por sí mismo |
| 2 | `getSessionRedirectUrl()` / `getReturnPath()` / `toSitePath()` | URLs de redirección validadas (solo rutas del sitio) |
| 2 | `navigateTo(path, { replace })` | Ir a otra página sin que la recarga de las filas la cancele |
| 3 | `applySessionRows(block)` | Filas con el estado en la última celda (la llama `applyBlockOptions`) |
| 3 | `setSessionVisibility(el, states)` / `parseSessionStates(text)` | Mostrar u ocultar |
| 3 | `renderForSession(target, views)` | Pintar según el estado |

## 8. Casos probados

| # | Caso | Resultado |
|---|---|---|
| 1 | Página pública sin reglas | Igual que antes |
| 2 | `/perfil` (`Session: true`, `Redirect With Session: /login`) sin sesión | Va a `/login?redirect=%2Fperfil` |
| 2b | `Session: true` sin `Redirect With Session` | Va al home `/` |
| 2c | `Session: false`, vacía o sin la fila | La página se ve |
| 3 | Login correcto desde ahí | Regresa a `/perfil` |
| 4 | `/perfil` como invitado | Va al login (el invitado no alcanza) |
| 5 | Ejemplo sin sesión | Se ven las filas `signed-out` y "para todos"; el bloque `signed-in` oculto |
| 6 | Invitado / cerrar sesión en el ejemplo | La página se recarga y muestra las filas del nuevo estado |
| 6b | Breadcrumb con `Level 2` por estado (última celda) | Muestra "Visitante", "Invitado" o "Mi cuenta" sin cambiar su código |
| 7 | Cerrar sesión en una página `Session: true` | Redirige |
| 8 | `/login` ya con sesión | Va a `Redirect With Session` sin mostrar el formulario |
| 9 | Login en modo paso | Al iniciar sesión o como invitado se oculta y aparece lo `signed-in, guest`, sin recargar |
| 10 | `?redirect=//otro.com` | Se ignora |
| 11 | Sesión vencida | Cuenta como `signed-out` |
| 12 | Llamada privada sin sesión | No llama al servicio y redirige al login |
| 13 | Llamada privada con sesión | Header `Authorization: Bearer …` y `security.auth.value` iguales |
| 14 | Home, celulares, detalle | Igual que antes |

## 9. Seguridad

- **Ocultar no es proteger.** El HTML y el JavaScript son públicos: lo oculto sigue en la página.
  Los datos privados solo deben llegar del servicio con `REQUEST_TYPE.PRIVATE`.
- El token **nunca** va en el código ni en Drive: sale de `getAccessToken()` después del login.
- `?redirect=` y las rutas de la tabla solo aceptan **rutas del sitio** (nada de `//otro.com` ni
  `javascript:`).
- La sesión vive en `sessionStorage` (se borra al cerrar la pestaña) y vence con `expiresIn`.
- Nunca se escribe la sesión en `console`.

## 10. Llevarlo a otro proyecto

1. Copia `scripts/foundations/session.js`, `block-utils.js`, `block-options.js` y
   `styles/foundations/sessions.css`.
2. En `head.html`: `<link rel="stylesheet" href="/styles/foundations/sessions.css">`.
3. En `scripts.js`, al inicio de `loadEager`: `if (!guardPage()) return false;` y en `loadPage`:
   `if (!(await loadEager(document))) return;`.
4. Ajusta los ajustes de arriba de `session.js`: `DEFAULT_SESSION_REDIRECT`, las llaves de
   `sessionStorage` y `EDITOR_PREVIEW_HOSTS`.
5. Para llamadas privadas, copia `privateRequestInterceptor` de `scripts/api/interceptors.js`.
