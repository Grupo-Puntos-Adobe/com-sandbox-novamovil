# 04 · Archivos solo locales 🔒 (no se suben a git)

Todos son 🆕 creados por nosotros. Se ignoran con reglas **locales** de `.git/info/exclude`
(no con el `.gitignore` del proyecto), así que solo existen en esta copia de trabajo.
Ninguno afecta al sitio publicado; son herramientas y material de trabajo.

## Reglas locales de git

| Archivo | Para qué sirve |
|---|---|
| `.git/info/exclude` | Ignora localmente `/content`, `/migration-work`, `/catalog`, `/tools/importer` y `/.agents` |

## `.agents/` (1)

| Archivo | Para qué sirve |
|---|---|
| `.agents/settings.json` | Complementos del asistente activados (buenas prácticas web y gestión de proyecto) |

## `.migration/` (2)

Aparece como "sin seguimiento" en git (no está en ninguna regla de ignorar); no se ha subido.

| Archivo | Para qué sirve |
|---|---|
| `.migration/project.json` | Organización y sitio de vista previa (`grupo-puntos-adobe/com-sandbox-novamovil`) |
| `.migration/plans/rediseno-header-novamovil.md` | Plan del rediseño del header |

## `tools/importer/` (22) · importador al panel de Documentos

| Archivo | Para qué sirve |
|---|---|
| `import-docx-pages.js` | Script de importación de las páginas que salen de los `.docx` |
| `import-docx-pages.bundle.js` | Versión empaquetada del anterior (la que se ejecuta) |
| `import-home.js` / `import-home.bundle.js` | Primer importador de la home desde el sitio publicado |
| `page-templates.json` | Plantillas de página y sus URLs para el importador |
| `transformers/novamovil-cleanup.js` | Limpia header/footer y elementos que no son contenido |
| `transformers/novamovil-sections.js` | Inserta los separadores de sección (`<hr>`) que el importador borra |
| `urls-docx-pages.txt`, `urls-footer.txt`, `urls-home.txt`, `urls-index.txt` | Listas de URLs para cada importación |
| `reports/*.report.json` (9) | Resultado de importar cada página (index, nav, footer, celulares, planes, accesorios, promociones, cuenta, carrito) |
| `reports/import-docx-pages.report.xlsx`, `reports/import-home.report.xlsx` | Resumen de cada importación |

## `migration-work/` (53) · material de trabajo

**Generadores de contenido**

| Archivo | Para qué sirve |
|---|---|
| `docx_builder.py` | Genera los `.docx` de `content-drive/` (incluye filas `Styles`/`Classname` y `Title`) |
| `docx_to_html.py` | Convierte los `.docx` en páginas fuente para el importador |
| `docx-source/*.html` (9) | Páginas fuente generadas (index, nav, footer, celulares, planes, accesorios, promociones, cuenta, carrito) |
| `docx-source/media/index-image1.jpeg` | Imagen del hero extraída del `index.docx` |
| `hero-phone.jpg` | Imagen del teléfono usada en el hero |

**Datos de prueba de servicios**

| Archivo | Para qué sirve |
|---|---|
| `cat-response.json` | Respuesta de ejemplo del servicio de categorías |
| `featured-response.json` | Respuesta de ejemplo del servicio de destacados |
| `promotions-live.json` | Respuesta real del servicio de promociones |
| `probe.json`, `probe.img` | Pruebas de conexión a servicios/imágenes |

**Referencias de diseño (imágenes que enviaste)**

| Archivo | Para qué sirve |
|---|---|
| `ref-home.jpg`, `ref-header.jpg` | Home completa y header |
| `ref-hero-desktop.jpg`, `ref-hero-mobile.jpg` | Hero |
| `ref-cat-desktop.jpg`, `ref-cat-mobile.jpg` | Categorías |
| `ref-feat-desktop.jpg`, `ref-feat-mobile.jpg` | Destacados |
| `ref-promo-desktop.jpg`, `ref-promo-mobile.jpg` | Promociones |
| `ref-footer-desktop.jpg`, `ref-footer-mobile.jpg` | Footer |

**Capturas de verificación**

| Archivo | Para qué sirve |
|---|---|
| `check-hero.png`, `check-buttons.png` | Hero y botones |
| `check-header-fixed-mobile.png` | Header fijo en móvil |
| `check-cat-desktop.png`, `check-cat-tablet.png`, `check-cat-mobile.png`, `check-hover-hogar.png` | Categorías y hover |
| `check-featured-desktop.png`, `check-featured-mobile.png` | Destacados |
| `check-promo-desktop.png`, `check-promo-mobile.png` | Promociones |
| `check-empty.png`, `check-toast.png` | Mensaje vacío y alerta flotante |
| `screenshot.png` | Captura del sitio original |

**Análisis de la página**

| Archivo | Para qué sirve |
|---|---|
| `cleaned.html` | HTML limpio del sitio publicado |
| `page-structure.json`, `authoring-analysis.json`, `visual-trees.json` | Estructura y análisis de secciones/bloques |
| `metadata.json` | Variantes de bloques detectadas |
| `importer/page-validation.json` | Validación de la página importada |
| `migration-plan.md` | Plan de migración |
| `preflight.txt`, `profile.json` | Comprobaciones previas y perfil del proyecto |

## `catalog/` (6) · catálogo del sitio

| Archivo | Para qué sirve |
|---|---|
| `.pages/_global/header.json`, `.pages/_global/header.jpg` | Análisis y captura del header |
| `.blocks/header-global/screenshots/header-global.jpg` | Captura del bloque header |
| `.pages/main--…--7ac4091a/page-catalog.json`, `full-page.jpg` | Análisis y captura de la home |
| `classify.log` | Registro de la clasificación de páginas |

## `node_modules/`

Dependencias de desarrollo (`npm install`, para lint). Se ignoran con el `.gitignore` del proyecto; no se listan.
