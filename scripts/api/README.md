# API · `http-client.js` e `interceptors.js`

Las **únicas** llamadas a servicios del sitio pasan por aquí: ningún bloque usa `fetch` directo.
Sin librerías (no hay build): `fetch`, `AbortSignal` y `URL` nativos.

| Archivo | Qué hace | Exporta |
|---|---|---|
| `http-client.js` | El único que llama a `fetch`: arma la URL, corre los interceptores, aplica el tiempo máximo y convierte cualquier falla en `ApiError` | `get`, `post`, `request`, `REQUEST_TYPE`, `API_BASE_URL`, `DEFAULT_TIMEOUT` |
| `interceptors.js` | Qué hace cada **tipo de llamada** (pública o privada) y el error uniforme | `REQUEST_TYPE`, `ApiError`, `publicRequestInterceptor`, `privateRequestInterceptor`, `registerInterceptor`, `resolveInterceptors` |

Guía paso a paso de cómo se integró: `documentation/07-integracion-endpoints.md`.

---

## 1. Los dos tipos de llamada

| `REQUEST_TYPE` | Nombre | Para | Qué hace |
|---|---|---|---|
| `PUBLIC` (por defecto) | `'public-request'` | **Llamadas simples, sin sesión**: categorías, catálogo, detalle, login | Headers JSON; OK → JSON; 204 → `null`; error (400, 401, 500…) → `ApiError` con el JSON del servicio en `error.cause` |
| `PRIVATE` | `'private-request'` | **Llamadas con sesión**: perfil, pedidos, datos de compra | Lo mismo que `PUBLIC` y además `Authorization: Bearer {token}` y el mismo valor en `security.auth.value` del cuerpo. **Sin sesión no llama** (`ApiError` 401). Con un 401: `clearUserSession()` y va a `Redirect To` de la página (o al home) |

```js
import { get, post, REQUEST_TYPE } from '../../scripts/api/http-client.js';

const categories = await get(endpoint);                                   // pública
const result = await post(endpoint, body);                                // pública
const profile = await post(endpoint, body, { interceptor: REQUEST_TYPE.PRIVATE }); // privada
```

El token sale de `scripts/foundations/session.js` (`getAuthorizationHeader()`), después del login. **Nunca**
se escribe un token ni una API key en el código ni en Drive.

### En Drive: `Endpoint` es público, `Private Endpoint` es privado

| Fila en la tabla del bloque | Tipo de llamada | Cómo se lee en el bloque |
|---|---|---|
| `Endpoint` (y las de cada bloque: `Search Endpoint`, `Filters Endpoint`) | `REQUEST_TYPE.PUBLIC` | `readEndpoint(block)` (las filas con otro nombre, con `readTableCell`) |
| `Private Endpoint` (también se acepta `PrivateEndpoint`) | `REQUEST_TYPE.PRIVATE` (con Bearer) | `readPrivateEndpoint(block)` |

Los bloques que ya existen siguen con `Endpoint` y no cambian. Un servicio que necesita sesión va
**siempre** en `Private Endpoint`, así el autor sabe en la tabla cuál es privado:

```js
import { readPrivateEndpoint } from '../../scripts/foundations/block-utils.js';
import { post, REQUEST_TYPE } from '../../scripts/api/http-client.js';

const privateEndpoint = readPrivateEndpoint(block);
if (privateEndpoint) post(privateEndpoint, body, { interceptor: REQUEST_TYPE.PRIVATE });
```


## 2. `http-client.js`

### Funciones

| Función | Uso |
|---|---|
| `get(url, options)` | `GET` |
| `post(url, body, options)` | `POST`; si `body` es un objeto se manda como JSON (`Content-Type: application/json`) |
| `request(url, options)` | Cualquier método |

### Opciones

| Opción | Por defecto | Ejemplo |
|---|---|---|
| `method` | `'GET'` | `'POST'` |
| `headers` | `{}` | `{ 'X-Canal': 'web' }` |
| `body` | — | `{ sku: 'IPH-15' }` |
| `params` | — | `{ page: 2 }` → `?page=2` |
| `timeout` | `DEFAULT_TIMEOUT` (8000 ms) | `15000` |
| `interceptor` | `REQUEST_TYPE.PUBLIC` | `REQUEST_TYPE.PRIVATE`, un objeto interceptor o una lista |
| `signal` | — | `controller.signal` para cancelar (por ejemplo una búsqueda anterior) |

- **URL:** si empieza con `http` se usa tal cual; si es relativa (`/api/v1/…`) se completa con
  `API_BASE_URL`.
- **Tiempo máximo:** `AbortSignal.timeout`; con `signal` propio se combinan (`AbortSignal.any`).

### Orden de una llamada

```
get(url) / post(url, body)
  └─ request(url, options)
       ├─ resolveInterceptors(interceptor)      → la cadena del tipo de llamada
       ├─ request(config) de cada interceptor   → headers, token…  (PRIVATE sin sesión: ApiError 401)
       ├─ fetch(…) + timeout                    → red / tiempo: ApiError status 0
       ├─ response(response) de cada uno        → JSON  |  ApiError (con el JSON de error)
       └─ si algo falló: error(e) de cada uno   → PRIVATE con 401: clearUserSession + redirección
```

## 3. `interceptors.js`

### `ApiError`

Todo error llega igual al bloque:

| Propiedad | Qué trae |
|---|---|
| `message` | `HTTP 401 Unauthorized`, `Network error`, `Timeout after 8000ms`, `Invalid JSON response`, `Session required` |
| `status` | El HTTP (`400`, `401`, `500`…) o `0` sin red / tiempo agotado |
| `url` | La URL pedida |
| `cause` | El JSON de error del servicio (`{ status: { message }, errors: [{ field, message }] }`), `null` si no trae JSON, o el error original |

```js
try {
  const response = await post(settings.endpoint, body);
} catch (error) {
  const serviceBody = error.cause;   // mensajes del servicio para mostrarlos en el bloque
}
```

### Los interceptores

Un interceptor es un objeto con tres ganchos, todos opcionales:

| Gancho | Cuándo | Para qué |
|---|---|---|
| `request(config)` | Antes de `fetch` | Cambiar URL, headers, params, body |
| `response(response, config)` | Al recibir la respuesta | Validar el estado y convertir a JSON |
| `error(error, config)` | Si algo falla | Registrar, recuperar (devolver un valor) o relanzar |

| Interceptor | En qué cadena | Qué hace |
|---|---|---|
| `publicRequestInterceptor` | `PUBLIC` y `PRIVATE` | `Accept: application/json`; valida el estado; JSON; guarda el JSON de error en `cause` |
| `privateRequestInterceptor` | `PRIVATE` (después del público) | Agrega el Bearer (header y `security.auth.value`); sin sesión no llama; 401 → `clearUserSession()` + `Redirect To` (nunca redirige en el panel de edición) |

### Agregar otro tipo de llamada

```js
import { registerInterceptor, publicRequestInterceptor } from './interceptors.js';

const channelInterceptor = {
  name: 'channel',
  request(config) {
    return { ...config, headers: { ...config.headers, 'X-Canal': 'web' } };
  },
};
registerInterceptor('channel-request', [publicRequestInterceptor, channelInterceptor]);

// en el bloque
get(endpoint, { interceptor: 'channel-request' });
```

Un nombre que no existe usa la cadena pública.

## 4. Quién lo usa

| Bloque | Llamada |
|---|---|
| `card-categories`, `card-featured`, `card-promotions` | `get(Endpoint)` |
| `product-catalog` | `get(Filters Endpoint)` y `post(Search Endpoint, body, { signal })` |
| `product-detail` | `post(Endpoint, { meta, security, data: { productId } })` |
| `login` | `post(Endpoint, { meta, security, data: { emailOrPhone, password } })` (pública; lee los errores de `error.cause`) |
| `block-session-example` | `post(Private Endpoint, …, { interceptor: REQUEST_TYPE.PRIVATE })` (fila `Private Endpoint`) |

## 5. Dependencias y cómo llevarlo a otro proyecto

- `http-client.js` → `interceptors.js`.
- `interceptors.js` → `scripts/foundations/session.js` (`getAuthorizationHeader`, `clearUserSession`,
  `getSessionData` para `page.redirectPath` e `isEditingToolPreview`, y `goToPage`), solo para la
  llamada privada.

Para llevarlo: copia `scripts/api/` (y `scripts/foundations/` si usas la llamada privada) y cambia
`API_BASE_URL` en `http-client.js`. Un servicio nuevo debe contestar la consulta `OPTIONS` (CORS)
de los `POST` con JSON, o la llamada falla en el navegador aunque funcione con curl.
