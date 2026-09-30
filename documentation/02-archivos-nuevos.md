# 02 · Archivos nuevos en git

Todos son 🆕 creados por nosotros y se suben a git (los `.docx` están en [03-contenido.md](03-contenido.md)).

## Estilos

| Archivo | Para qué sirve | Parte del template que afecta |
|---|---|---|
| `styles/colors.css` | **Única fuente de colores**: paleta, degradados y variables por componente (`--header-*`, `--card-*`, `--toast-*`, `--footer-*`…) | Se carga desde `head.html` y `404.html`; la usan `styles.css` y todos los bloques |
| `styles/toast.css` | Estilos de la alerta flotante (`.toast-novamovil`) | La carga `scripts/toast.js` la primera vez que se muestra una alerta |

## Scripts compartidos

| Archivo | Para qué sirve | Parte del template que afecta |
|---|---|---|
| `scripts/block-options.js` | Filas opcionales **Styles / Classname** en cualquier bloque (valida y aplica, quita la fila) | Lo llama `scripts/scripts.js` → `decorateMain` |
| `scripts/block-utils.js` | Utilidades de bloques: leer celda sin procesar (`readRawCell`), título del bloque (`buildBlockHeader`), opciones de alerta, enlaces seguros, filas balanceadas | Lo importan los bloques `card-*` |
| `scripts/brand.js` | Logo de marca (imagen de Drive o texto `NovaMóvil` por defecto) | Lo usan `blocks/header/header.js` y `blocks/footer/footer.js` |
| `scripts/toast.js` | Alerta flotante arriba a la derecha (duración y color configurables) | La usan los bloques `card-*` cuando falla un servicio |
| `scripts/api/http-client.js` | Único punto que hace `fetch`: timeout, query params, URL base, errores uniformes (`ApiError`) | Lo usan los bloques `card-*` |
| `scripts/api/interceptors.js` | Interceptores de peticiones (`public` activo, plantilla de `auth` para tokens) | Lo usa `http-client.js` |

## Bloques (componentes)

| Archivo | Para qué sirve | Relación con el template |
|---|---|---|
| `blocks/hero-novamovil/hero-novamovil.js` | Hero de la home: etiqueta, título, texto, botones, estadísticas, imagen | Bloque propio; `blocks/hero` original **no se tocó** |
| `blocks/hero-novamovil/hero-novamovil.css` | Estilos dentro de `.hero-novamovil` | — |
| `blocks/card-categories/card-categories.js` | Categorías desde un servicio (`Endpoint`) o JSON interno; hover con el color de cada categoría | Bloque propio; `blocks/cards` original sigue aparte |
| `blocks/card-categories/card-categories.css` | Estilos dentro de `.card-categories` | — |
| `blocks/card-featured/card-featured.js` | Productos destacados desde un servicio o JSON interno | Bloque propio |
| `blocks/card-featured/card-featured.css` | Estilos dentro de `.card-featured` | — |
| `blocks/card-promotions/card-promotions.js` | Promociones con degradado del color del JSON | Bloque propio |
| `blocks/card-promotions/card-promotions.css` | Estilos dentro de `.card-promotions` | — |

## Fuentes

| Archivo | Para qué sirve | Parte del template que afecta |
|---|---|---|
| `fonts/plus-jakarta-sans-400.woff2` | Texto normal | Declarada en `styles/fonts.css` |
| `fonts/plus-jakarta-sans-600.woff2` | Semibold (botones, etiquetas) | Igual |
| `fonts/plus-jakarta-sans-700.woff2` | Bold (títulos) | Igual |
| `fonts/plus-jakarta-sans-800.woff2` | Extra bold (títulos grandes) | Igual |

## Iconos

| Archivo | Para qué sirve | Parte del template que afecta |
|---|---|---|
| `icons/cart.svg` | Icono del carrito (header) | Los usa `decorateIcons` de `scripts/aem.js` (sin modificarlo) |
| `icons/user.svg` | Icono de cuenta (header) | Igual |
| `icons/close.svg` | Cerrar búsqueda/menú | Igual |
| `icons/logo.svg` | Logo de marca | Igual |

## Documentación

| Archivo | Para qué sirve | Parte del template que afecta |
|---|---|---|
| `documentation/*.md` | Esta carpeta (8 archivos) | Ninguna; excluida de la publicación en `.hlxignore` |
