# 01 · Archivos base del template modificados y eliminados

Todos son 📦 archivos base del AEM Boilerplate y están en git.

## ✏️ Modificados (10)

| Archivo | Para qué sirve | Qué cambiamos | Parte del template que afecta |
|---|---|---|---|
| `head.html` | `<head>` de todas las páginas | Agrega `<link>` a `styles/colors.css` | Carga inicial de todas las páginas |
| `404.html` | Página de error 404 | Agrega `<link>` a `styles/colors.css` | Página 404 |
| `.hlxignore` | Archivos del repo que **no** se publican | Cambia `.*` por la lista explícita de dotfiles (para no ocultar `/.rum`) y agrega `content-drive/` y `documentation/` | Qué se publica del código |
| `styles/styles.css` | Estilos globales | Colores movidos a `colors.css`; fuente Plus Jakarta Sans; `h2` 24/28 px; fondo `--page-background`; pesos de títulos/botones; escala `z-index` (toast 900, header 1000); `scroll-padding-top` por el header fijo | Todo el sitio |
| `styles/fonts.css` | Declaración de fuentes | Roboto / Roboto Condensed → Plus Jakarta Sans 400/600/700/800 | Tipografía de todo el sitio |
| `blocks/header/header.js` | Arma el header desde el documento `nav` | Header NovaMóvil: logo (desde Drive o `NovaMóvil` por defecto), menú, búsqueda que se expande, cuenta, carrito con contador, menú móvil | Header de todas las páginas |
| `blocks/header/header.css` | Estilos del header | Reescrito dentro de `.header-novamovil`; degradado de marca; fijo arriba de todo (`position: fixed`, `--z-index-header`) | Header de todas las páginas |
| `blocks/footer/footer.js` | Arma el footer desde el documento `footer` | Footer NovaMóvil: columna de marca, columnas de enlaces, medios de pago; funciona aunque falte el documento | Footer de todas las páginas |
| `blocks/footer/footer.css` | Estilos del footer | Reescrito dentro de `.footer-novamobil` | Footer de todas las páginas |
| `blocks/cards/cards.css` | Estilos del bloque Cards original | Borde `#dadada` → `var(--border-color)` (colores solo desde variables) | Bloque Cards |

## 🗑️ Eliminados (4)

| Archivo | Motivo |
|---|---|
| `fonts/roboto-regular.woff2` | Reemplazada por Plus Jakarta Sans (ver `styles/fonts.css`) |
| `fonts/roboto-medium.woff2` | Igual |
| `fonts/roboto-bold.woff2` | Igual |
| `fonts/roboto-condensed-bold.woff2` | Igual |

## Modificados y luego revertidos

| Archivo | Historia |
|---|---|
| `scripts/scripts.js` | Llamaba a `applyBlockOptions` para todos los bloques (`dc91d2b`). Se revirtió: ahora es **idéntico al template** y cada bloque NovaMóvil llama la función (ver [08-styles-classname.md](08-styles-classname.md)) |
