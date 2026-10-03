# 02 · Integración de peticiones a endpoints (cliente HTTP, interceptores y alertas)

Esta guía explica, paso a paso, cómo los componentes `card-categories`, `card-featured` y
`card-promotions` obtienen sus datos de un servicio: **qué se instaló**, **qué archivos se crearon
o modificaron desde el inicio**, **si se tocó el template de AEM Edge Delivery** y **cómo funciona
todo por dentro**.

---

## 1. Resumen rápido

| Pregunta | Respuesta |
|---|---|
| ¿Qué librerías se instalaron? | **Ninguna.** Todo usa APIs nativas del navegador (`fetch`, `AbortSignal`, `URL`, `popover`) |
| ¿Se ejecutó `npm install` de algo nuevo? | **No.** `package.json` y `package-lock.json` siguen idénticos al template |
| ¿Hay paso de compilación (build)? | **No.** Los archivos `.js` se sirven tal cual; AEM Edge Delivery no tiene build |
| ¿Se modificó `scripts/aem.js`? | **No.** Solo se usan sus funciones `readBlockConfig` y `loadCSS` |
| ¿Se modificó `scripts/scripts.js`? | **No** para esta integración |
| ¿Qué archivos del template se tocaron? | Solo `styles/styles.css` (variable `--z-index-toast`) y, de forma indirecta, `head.html` ya cargaba `styles/colors.css` |
| ¿Dónde se configura la URL del servicio? | En el **documento de Drive**, fila `Endpoint` de cada bloque |

## 2. Por qué no se instaló ninguna librería

En proyectos tradicionales se usaría **axios** (peticiones con interceptores) y alguna librería de
notificaciones (toastify, sonner…). Aquí **no**, por cuatro motivos:

1. **AEM Edge Delivery no tiene build.** No hay webpack/vite que empaquete `node_modules`. Una
   librería de npm no llega al navegador a menos que se copie a mano al repositorio.
2. **Rendimiento.** El proyecto apunta a Lighthouse 100. Cada KB de JavaScript cuenta; axios pesa
   ~13 KB comprimido, nuestro cliente completo (cliente + interceptores) pesa ~3 KB comprimido, con comentarios incluidos.
3. **El navegador ya lo tiene todo.** `fetch` (peticiones), `AbortSignal.timeout` (tiempo máximo),
   `URL` (armar URLs y query params) y `popover` (capas flotantes) son APIs estándar.
4. **Regla del proyecto** (`AGENTS.md`): *"No build step; devDependencies only."* Las únicas
   dependencias son de desarrollo (lint), y siguen siendo las mismas del template.

Lo que axios hace (interceptores, timeout, errores uniformes, JSON automático) se implementó en
~200 líneas propias, en dos archivos.

## 3. Archivos involucrados

📦 = archivo base del template · 🆕 = creado nuevo

| Archivo | Origen | Qué hace en la integración | Commit |
|---|---|---|---|
| `scripts/api/http-client.js` | 🆕 | **Único punto que llama a `fetch`**: arma la URL, aplica interceptores, timeout, convierte errores | `1bccaff` |
| `scripts/api/interceptors.js` | 🆕 | `ApiError`, `publicInterceptor`, registro de interceptores y plantilla de `auth` | `1bccaff` |
| `scripts/toast.js` | 🆕 | Alerta flotante arriba a la derecha cuando falla un servicio | `1bccaff` |
| `styles/toast.css` | 🆕 | Estilos de la alerta (`.toast-novamovil`) | `1bccaff`, `db5a73d` |
| `styles/colors.css` | 🆕 | Colores de la alerta (`--toast-*`) | `1bccaff` |
| `scripts/block-utils.js` | 🆕 | `readTableCell` (leer el endpoint tal cual), `getAlertOptions`, `getSafeHref` | `70c643f` |
| `blocks/card-categories/card-categories.js` | 🆕 | Pide `data.categories` | `1bccaff` |
| `blocks/card-featured/card-featured.js` | 🆕 | Pide `data.products` | `70c643f` |
| `blocks/card-promotions/card-promotions.js` | 🆕 | Pide `data.promotions` | `b44c69d` |
| `blocks/card-*/card-*.css` | 🆕 | Esqueleto de carga y mensaje de "no hay elementos" | mismos commits |
| `content-drive/index.docx` | 🆕 | Filas `Endpoint`, `Alert Duration`, `Alert Color` en cada tabla | mismos commits |
| `styles/styles.css` | 📦 ✏️ | Agrega `--z-index-toast: 900` (la alerta queda bajo el header, `1000`) | `db5a73d` |
| `head.html` | 📦 ✏️ | Ya cargaba `styles/colors.css` desde el header; **no se cambió para esto** | `5fa25e7` (header) |
| `scripts/aem.js` | 📦 | **Sin cambios.** Se usan `readBlockConfig` y `loadCSS` | — |
| `scripts/scripts.js` | 📦 | **Sin cambios** | — |
| `package.json` | 📦 | **Sin cambios.** No se instaló nada | — |

## 4. Arquitectura

```
Documento de Drive
  └─ tabla "Card Categories"  →  fila Endpoint = https://…/api/v1/home/categories
                                   fila Alert Duration = 5 · Alert Color = error
                     │
                     ▼
blocks/card-categories/card-categories.js  (decorate)
  ├─ readTableCell(block, 'endpoint')          ← scripts/block-utils.js
  ├─ ¿hay endpoint?
  │    ├─ NO → pinta FALLBACK_CATEGORIES (JSON interno del bloque)
  │    └─ SÍ → pinta esqueleto y llama:
  │             get(endpoint)                 ← scripts/api/http-client.js
  │               ├─ interceptores request    ← scripts/api/interceptors.js
  │               ├─ fetch() + timeout 8 s    (API nativa del navegador)
  │               └─ interceptores response   → JSON  |  ApiError
  │
  ├─ OK con lista      → pinta tarjetas
  ├─ OK con lista vacía → mensaje "no hay elementos"
  └─ ERROR             → console.error + showToast()   ← scripts/toast.js (+ styles/toast.css)
                          + mensaje "no hay elementos"
```

Ningún bloque llama a `fetch` directamente: **todo pasa por `http-client.js`**. Así, si mañana los
servicios piden un token, se cambia en un solo lugar.

## 5. Paso a paso de cómo se integró

### Paso 1 · Verificar el servicio (antes de escribir código)

Se comprobó con `curl` que el mock de Postman:
- responde `200` con JSON,
- y envía **`access-control-allow-origin: *`** (CORS). Sin esa cabecera, el navegador bloquearía
  la petición aunque en Postman funcione.

```bash
curl -s -D - -H "Origin: https://main--com-sandbox-novamovil--grupo-puntos-adobe.aem.page" \
  https://cca7ebd1-f76f-47d0-a949-b4b8618f05e5.mock.pstmn.io/api/v1/home/categories
```

Estado actual de los tres servicios:

| Endpoint | Estado | CORS |
|---|---|---|
| `/api/v1/home/categories` | 200 | ✅ `*` |
| `/api/v1/home/promotions` | 200 | ✅ `*` |
| `/api/v1/products/featured` | 200 | ✅ `*` |

### Paso 2 · Crear el error uniforme `ApiError` (`scripts/api/interceptors.js`)

Cualquier falla (red, timeout, HTTP 4xx/5xx, JSON inválido) se convierte en el mismo tipo de error,
para que todos los bloques lo manejen igual:

```js
export class ApiError extends Error {
  constructor(message, { status = 0, url = '', cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status; // 0 = red o timeout; 404, 500… = HTTP
    this.url = url;
  }
}
```

### Paso 3 · Crear los interceptores (`scripts/api/interceptors.js`)

Un interceptor es un objeto con hasta tres funciones **opcionales**:

| Función | Cuándo corre | Para qué |
|---|---|---|
| `request(config)` | Antes de `fetch` | Cambiar URL, headers, params, body (p. ej. agregar un token) |
| `response(response, config)` | Al recibir la respuesta | Validar el estado y convertir a JSON |
| `error(error, config)` | Si algo falla | Registrar, recuperar (devolver un valor) o relanzar |

El único activo hoy es **`publicInterceptor`** (servicios públicos, sin credenciales):

```js
export const publicInterceptor = {
  name: 'public',
  request(config) {
    return { ...config, headers: { Accept: 'application/json', ...config.headers } };
  },
  async response(response, config) {
    if (!response.ok) {                       // 4xx / 5xx → error
      throw new ApiError(`HTTP ${response.status} ${response.statusText}`.trim(),
        { status: response.status, url: config.url });
    }
    if (response.status === 204) return null; // sin contenido
    try {
      return await response.json();           // OK → JSON
    } catch (cause) {
      throw new ApiError('Invalid JSON response', { status: response.status, url: config.url, cause });
    }
  },
};
```

Y un **registro** para agregar más sin tocar el cliente:

```js
const registry = new Map([['public', [publicInterceptor]]]);
export function registerInterceptor(name, chain) { registry.set(name, [].concat(chain)); }
export function resolveInterceptors(interceptor = 'public') { … } // nombre, objeto o lista
```

En el mismo archivo hay una **plantilla comentada** de `authInterceptor` (con
`Authorization: Bearer …`) para cuando algún servicio requiera token (ver sección 7).

### Paso 4 · Crear el cliente HTTP (`scripts/api/http-client.js`)

Es el **único archivo que llama a `fetch`**. Expone `request`, `get` y `post`:

```js
export const API_BASE_URL = 'https://cca7ebd1-f76f-47d0-a949-b4b8618f05e5.mock.pstmn.io';
export const DEFAULT_TIMEOUT = 8000;

export async function request(url, options = {}) { … }
export const get  = (url, options = {})       => request(url, { ...options, method: 'GET' });
export const post = (url, body, options = {}) => request(url, { ...options, method: 'POST', body });
```

Qué hace `request`, en orden:

1. **Resuelve la cadena de interceptores** (`'public'` por defecto).
2. **Corre los `request()`** de cada interceptor, uno tras otro, sobre la configuración.
3. **Arma la URL**: si empieza con `http` se usa tal cual; si es relativa (`/api/v1/...`) se completa
   con `API_BASE_URL`. Los `params` se agregan como query string con la API nativa `URL`.
4. **Body JSON automático**: si `body` es un objeto, se envía con `JSON.stringify` y
   `Content-Type: application/json`.
5. **Timeout**: `AbortSignal.timeout(8000)` cancela la petición a los 8 s. Si además se pasa un
   `signal` propio, se combinan con `AbortSignal.any` (cuando el navegador lo soporta).
6. **`fetch`**: si falla la red o vence el tiempo → `ApiError('Network error' | 'Timeout after 8000ms')`.
7. **Corre los `response()`**: el `publicInterceptor` valida el estado y devuelve el JSON.
8. **Si algo falló**, corre los `error()`; si ninguno recupera, el error llega al bloque.

Opciones disponibles:

| Opción | Por defecto | Ejemplo |
|---|---|---|
| `method` | `GET` | `'POST'` |
| `headers` | `{}` | `{ 'X-Canal': 'web' }` |
| `body` | — | `{ sku: 'IPH-15' }` (se envía como JSON) |
| `params` | — | `{ page: 2, limit: 8 }` → `?page=2&limit=8` |
| `timeout` | `8000` ms | `15000` |
| `interceptor` | `'public'` | `'auth'`, un objeto o una lista |
| `signal` | — | `AbortController().signal` para cancelar |

### Paso 5 · Crear la alerta flotante (`scripts/toast.js` + `styles/toast.css`)

```js
showToast('No pudimos cargar las categorías…', { duration: 5000, variant: 'error' });
```

- Aparece **arriba a la derecha**, debajo del header; si hay varias, se **apilan**.
- `duration` en milisegundos (**5 s** por defecto; `0` = no se oculta sola). El temporizador se
  pausa si el usuario pasa el mouse o el foco por encima.
- `variant`: `error`, `warning`, `success`, `info` o un **color hexadecimal** (`#1a4fd8`).
- Accesible: `role="alert"` para error/warning, `role="status"` para el resto, botón **×** con
  `aria-label="Cerrar alerta"`.
- Usa `popover="manual"` (capa superior del navegador) cuando está disponible, con un respaldo de
  posición fija.
- El CSS **se carga solo la primera vez** que se muestra una alerta, con `loadCSS` de
  📦 `scripts/aem.js` (sin modificarlo). Si no hay errores, `toast.css` nunca se descarga.
- El texto se pone con `textContent`, nunca como HTML.

Colores en 🆕 `styles/colors.css`:

```css
--toast-text: var(--color-white);
--toast-error-background: color-mix(in srgb, var(--color-error) 75%, var(--color-gray-900));
--toast-warning-background: color-mix(in srgb, var(--color-warning) 70%, var(--color-gray-900));
--toast-success-background: color-mix(in srgb, var(--color-success) 65%, var(--color-gray-900));
--toast-info-background: var(--color-primary);
```

(Se oscurecen con `gray-900` para que el texto blanco tenga contraste suficiente, 4.5:1.)

En 📦 `styles/styles.css` se agregó la escala de capas, para que la alerta quede **debajo** del
header fijo:

```css
--z-index-toast: 900;
--z-index-header: 1000;
```

### Paso 6 · Utilidades compartidas (`scripts/block-utils.js`)

| Función | Por qué existe |
|---|---|
| `readTableCell(block, 'endpoint')` | `readBlockConfig` de AEM convierte los enlaces en URLs absolutas **de la página**. Una ruta relativa `/api/v1/...` terminaría apuntando al sitio y no a la API. Esta función lee la celda **tal como la escribió el autor** (texto o `href`) |
| `readRowTextOrDefault(block, fila, textoPorDefecto)` | Fila que no existe → el texto por defecto; fila vacía → `''` (esa parte no se pinta) |
| `getAlertOptions(config)` | Convierte las filas `Alert Duration` (segundos) y `Alert Color` en `{ duration, variant }` para `showToast`. Por defecto 5 s y `error` |
| `getSafeHref(path)` | Los enlaces que vienen del servicio solo se aceptan si son rutas del sitio o `http(s)`. Bloquea `javascript:` y similares |
| `formatPrice(value, currency)` | Devuelve el precio ya formateado (`$19,999`, sin decimales) con `LOCALE` y `CURRENCY` de `scripts/messages.js`; si la moneda no es válida usa `CURRENCY`. Hoy lo usa `card-featured`; cualquier bloque con precios debe usarlo |
| `buildBlockHeader(block, prefijo, opciones)` | Arma el título de la sección desde la fila `Title` (y el botón `Link` con `withLink`); sin texto no pinta nada |

### Paso 7 · Usarlo en cada bloque (`blocks/card-*/card-*.js`)

Los tres bloques siguen el mismo patrón y leen sus textos de la tabla (con `scripts/messages.js`
como respaldo). Ejemplo real de `card-categories`; las guías de cada bloque son
`04-card-categories.md`, `05-card-featured.md` y `06-card-promotions.md`:

```js
import { readBlockConfig } from '../../scripts/aem.js';
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import MESSAGES from '../../scripts/messages.js';            // mensajes genéricos
import { readTableCell, readRowTextOrDefault, getAlertOptions, … } from '../../scripts/block-utils.js';

const FALLBACK_CATEGORIES = [ … ];   // JSON interno: se usa si NO hay fila Endpoint
const SKELETON_ELEMENTS = 6;         // tarjetas grises mientras carga
const EMPTY_LIST_ICON = '🗂️';        // icono del aviso vacío si la tabla no trae Empty List Icon

function readCategoriesSettings(block) {   // todo lo que viene de la tabla, con sus defaults
  const readCellText = (key) => readTableCell(block, key).text;
  return {
    endpoint: …,                                      // fila Endpoint, tal cual
    alert: getAlertOptions(readBlockConfig(block)),   // Alert Duration / Alert Color
    messages: {
      errorResponseMessage: readCellText('error response message')  // fila de la tabla…
        || MESSAGES.errorResponseMessage,                           // …o mensaje genérico
      emptyListTitle: readRowTextOrDefault(block, 'empty list title', MESSAGES.emptyListTitle),
      …
    },
  };
}

async function loadCategoriesFromService(block, header, settings) {
  try {
    const response = await get(settings.endpoint);
    const categories = response?.data?.categories;
    if (!Array.isArray(categories)) {
      throw new Error('Unexpected response: data.categories is not a list');
    }
    // lista vacía → aviso de lista vacía
    renderCategories(block, header, normalizeCategories(categories), settings);
  } catch (error) {
    console.error('[card-categories] Could not load categories from', settings.endpoint, error);
    showToast(settings.messages.errorResponseMessage, settings.alert);   // alerta flotante
    renderCategories(block, header, [], settings);                       // aviso de lista vacía
  }
}

export default function decorate(block) {
  applyBlockOptions(block);
  const settings = readCategoriesSettings(block);
  // Title sin valor por defecto: si no viene en la tabla no hay título
  const header = buildBlockHeader(block, 'card-categories', { asDiv: true }); // featured: withLink

  if (!settings.endpoint) {                                     // sin endpoint → JSON interno
    renderCategories(block, header, normalizeCategories(FALLBACK_CATEGORIES), settings);
    return;
  }
  // esqueleto mientras carga; la petición NO bloquea el resto de la página
  block.setAttribute('aria-busy', 'true');
  block.replaceChildren(...[header, buildCategoriesSkeleton()].filter(Boolean));
  loadCategoriesFromService(block, header, settings);           // sin await, a propósito
}
```

Detalles importantes:
- **`loadCategoriesFromService` sin `await`**: el bloque termina de "decorarse" enseguida y AEM sigue
  cargando las demás secciones; los datos llegan después y reemplazan el esqueleto.
- **Esqueleto**: tarjetas grises del mismo tamaño que las reales, para que la página no brinque (CLS).
- **`normalizeCategories()`** (en los otros bloques `normalizeProducts()` / `normalizePromotions()`): filtra `active: false`, exige los campos mínimos, quita duplicados por `id`,
  ordena por `order` y valida colores (`#hex`) y enlaces (`getSafeHref`).
- **Pintado seguro**: todo con `createElementWithClass()` / `createElement` + `textContent`,
  **nunca `innerHTML`** con datos del servicio.
- **Tamaños solo en CSS**: el JS no pone `width`, `height` ni porcentajes. Del servicio solo pasan al
  CSS datos (el color de cada tarjeta, la calificación de 0 a 5) y el CSS del bloque decide cómo se ven.
- **Lista con nombre**: la lista lleva `aria-label` con el texto del `Title` ("Categorías, lista"); sin
  título no lleva nombre.

| Bloque | Campo que lee de la respuesta | Enlace de cada tarjeta |
|---|---|---|
| `card-categories` | `data.categories` | `path` de cada categoría |
| `card-featured` | `data.products` | `path` del producto o fila `Product Link` (`/productos/{sku}`); sin ninguno, sin enlace |
| `card-promotions` | `data.promotions` | `path` de la promoción o fila `Promo Link` (`/promociones/{id}`); sin ninguno, sin enlace |

### Paso 8 · Configurarlo en el documento (`content-drive/index.docx`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Card Categories                                                              │
├────────────────┬─────────────────────────────────────────────────────────────┤
│ Styles         │                                                             │
│ Classname      │                                                             │
│ Title          │ Categorías                                                  │
│ Endpoint       │ https://cca7ebd1-…mock.pstmn.io/api/v1/home/categories      │
│ Alert Duration │ 5          ← opcional, segundos (0 = hasta cerrarla)        │
│ Alert Color    │ error      ← opcional: error · warning · info · success · #hex│
└────────────────┴─────────────────────────────────────────────────────────────┘
```

- **Cambiar de servidor** (mock → pruebas → producción): solo se edita la fila `Endpoint` en Drive y
  se da Preview. **No hay que tocar código ni hacer deploy.**
- **Borrar la fila `Endpoint`**: el bloque usa su JSON interno.
- También se puede escribir una ruta relativa (`/api/v1/home/categories`): se completa con `API_BASE_URL`.

### Paso 9 · Probar los cuatro casos

| Caso | Cómo provocarlo | Resultado esperado |
|---|---|---|
| Servicio correcto | Endpoint válido | Tarjetas del servicio |
| Sin endpoint | Borrar la fila `Endpoint` | Tarjetas del JSON interno |
| Servicio con error | URL inexistente, servicio caído o >8 s | `console.error` + alerta flotante + mensaje "no hay elementos" |
| Lista vacía | El servicio responde `[]` | Solo el mensaje "no hay elementos" (sin alerta, no es un error) |

Además se verificó: sin desbordamiento en móvil/tablet/escritorio, foco con teclado,
`prefers-reduced-motion`, y que datos maliciosos (`<script>`, `javascript:`) se muestran como texto
o se descartan.

## 6. Tabla de comportamiento ante errores

| Qué falla | Mensaje interno (`ApiError`) | `status` |
|---|---|---|
| Sin conexión / CORS bloqueado | `Network error` | `0` |
| Tarda más de 8 s | `Timeout after 8000ms` | `0` |
| El servidor responde 404, 500… | `HTTP 404 Not Found` | `404`, `500`… |
| Responde algo que no es JSON | `Invalid JSON response` | el HTTP recibido |
| JSON sin la lista esperada | `Unexpected response: data.categories is not a list` | — |

En **todos** los casos el usuario ve lo mismo: alerta + mensaje de "no hay elementos". El detalle
técnico queda en la consola del navegador (`[card-categories] Could not load …`).

## 7. Cómo extenderlo

### Nuevo bloque que consume un servicio

```js
import { get } from '../../scripts/api/http-client.js';
import { showToast } from '../../scripts/toast.js';
import { readTableCell, getAlertOptions } from '../../scripts/block-utils.js';
// … mismo patrón del paso 7: endpoint del documento, fallback, esqueleto, try/catch
```

### Servicio que requiere token

1. En `scripts/api/interceptors.js`, descomentar y adaptar `authInterceptor`.
2. Registrarlo: `registerInterceptor('auth', [publicInterceptor, authInterceptor]);`
3. En el bloque: `get(endpoint, { interceptor: 'auth' })`.

> ⚠️ En AEM Edge Delivery todo el JavaScript es público. **Nunca** se debe escribir un token o API key
> en el código ni en el documento; el token debe obtenerlo el usuario al iniciar sesión.

### Enviar datos (POST)

```js
import { post } from '../../scripts/api/http-client.js';
await post('/api/v1/cart', { sku: 'IPH-15-128-BLK', qty: 1 });
```

## 8. Resumen de cambios al template de AEM Edge Delivery

| Archivo del template | ¿Se modificó para esta integración? | Detalle |
|---|---|---|
| `scripts/aem.js` | ❌ No | Se **usan** `readBlockConfig` y `loadCSS` |
| `scripts/scripts.js` | ❌ No | — |
| `head.html` | ❌ No (para esto) | Ya cargaba `styles/colors.css` desde la rama del header |
| `styles/styles.css` | ✅ Sí, 1 variable | `--z-index-toast: 900` |
| `package.json` | ❌ No | No se instaló ninguna dependencia |
| `fstab.yaml` / configuración | ❌ No | El endpoint vive en el documento, no en configuración |

Todo lo demás es **nuevo** y vive en `scripts/api/`, `scripts/toast.js`, `scripts/block-utils.js`,
`styles/toast.css`, `styles/colors.css` y los bloques `card-*`.
