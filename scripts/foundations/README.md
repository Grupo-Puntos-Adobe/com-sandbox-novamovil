# Foundations · JavaScript

Archivos de JavaScript **portables**: no dependen de ningún bloque del proyecto y se pueden llevar
a otro sitio de AEM Edge Delivery Services. Son el par de `styles/foundations/` (CSS).

| Archivo | Qué hace | Exporta |
|---|---|---|
| `block-options.js` | Filas opcionales `Styles` y `Classname` de cualquier bloque: aplica los estilos y las clases que escribe el autor en Drive y quita esas filas | `applyBlockOptions(block)` (default), `applyAuthorStyles(block, declarations)`, `applyAuthorClasses(block, names)` |
| `block-utils.js` | Ayudas para leer la tabla del bloque y validar datos de servicios | `readTableCell`, `readRowTextOrDefault`, `getAlertOptions`, `getSafeHref`, `buildSectionTitle`, `formatPrice` |
| `messages.js` | Mensajes genéricos con valor por defecto (alerta, lista vacía, foto que falla) y el formato de números / precios | `MESSAGES` (default), `LOCALE`, `CURRENCY` |
| `toast.js` | Alerta flotante arriba a la derecha, apilable, que se cierra sola | `showToast(message, { duration, variant })`, `TOAST_VARIANTS` |
| `page-context.js` | Datos que un bloque obtiene al cargar y otro bloque de la misma página necesita, sin importarse entre ellos (hoy: el nombre de la página actual) | `setCurrentPageName(name)`, `getCurrentPageName()`, `CURRENT_PAGE_NAME_EVENT` |

## Qué necesita cada uno

| Archivo | Depende de |
|---|---|
| `block-options.js` | nada |
| `block-utils.js` | `messages.js` (para `formatPrice`) |
| `messages.js` | nada |
| `page-context.js` | nada |
| `toast.js` | `scripts/aem.js` (`loadCSS`), `styles/foundations/toast.css` y sus colores `--toast-*` en `styles/colors.css`, más `--z-index-toast` en `styles/styles.css` |

## Llevarlos a otro proyecto

1. Copia `scripts/foundations/` y `styles/foundations/`.
2. Importa desde los bloques con la ruta de la carpeta:

   ```js
   import applyBlockOptions from '../../scripts/foundations/block-options.js';
   import { readTableCell, formatPrice } from '../../scripts/foundations/block-utils.js';
   import MESSAGES, { LOCALE, CURRENCY } from '../../scripts/foundations/messages.js';
   import { showToast } from '../../scripts/foundations/toast.js';
   ```

3. Ajusta lo propio del sitio:
   - **`messages.js`:** los textos, el idioma (`LOCALE`) y la moneda (`CURRENCY`);
   - **la alerta:** sus colores (`--toast-*`) y la capa `--z-index-toast`.

La API (`scripts/api/`: `http-client.js` e `interceptors.js`) no está aquí porque lleva la URL base
y los interceptores de este proyecto.
