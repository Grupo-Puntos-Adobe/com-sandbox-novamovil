# 03 · Contenido

## 🆕 Documentos para Google Drive (en git, `content-drive/`)

Se suben a la carpeta de Drive del sitio y se previsualizan desde ahí. No se publican como código
(`content-drive/` está en `.hlxignore`).

| Archivo | Para qué sirve |
|---|---|
| `content-drive/index.docx` | Home: Hero Novamovil, Card Categories, Card Featured, Card Promotions y Metadata |
| `content-drive/nav.docx` | Contenido del header: logo, menú, iconos de cuenta y carrito |
| `content-drive/footer.docx` | Contenido del footer: marca, columnas de enlaces, copyright, medios de pago |
| `content-drive/celulares.docx` | Página Celulares (estructura base) |
| `content-drive/planes.docx` | Página Planes (estructura base) |
| `content-drive/accesorios.docx` | Página Accesorios (estructura base) |
| `content-drive/promociones.docx` | Página Promociones (estructura base) |
| `content-drive/cuenta.docx` | Página Mi cuenta (estructura base) |
| `content-drive/carrito.docx` | Página Carrito (estructura base) |

Todas las tablas de bloque aceptan las filas opcionales `Styles` y `Classname` justo después del nombre.

## 🔒 Páginas del panel de Documentos (solo local, `content/`)

`content/` es un enlace a la carpeta de contenido del panel. Se genera con el importador
(ver [04-archivos-locales.md](04-archivos-locales.md)) a partir de los mismos `.docx`, para que el
panel y Drive muestren lo mismo.

| Archivo | Para qué sirve |
|---|---|
| `content/index.plain.html` | Home |
| `content/nav.plain.html` | Header |
| `content/footer.plain.html` | Footer |
| `content/celulares.plain.html` | Celulares |
| `content/planes.plain.html` | Planes |
| `content/accesorios.plain.html` | Accesorios |
| `content/promociones.plain.html` | Promociones |
| `content/cuenta.plain.html` | Mi cuenta |
| `content/carrito.plain.html` | Carrito |
| `content/zz-test-a.plain.html`, `zz-test-b.plain.html` | Páginas de prueba; no forman parte del sitio |
