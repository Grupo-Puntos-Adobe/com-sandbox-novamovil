# 06 · Mapa: cómo se conecta todo con el template

📦 = archivo base del template · 🆕 = nuevo

## En el navegador (sitio publicado)

```
📦 head.html
 ├─► 🆕 styles/colors.css           (colores de todo el sitio)
 ├─► 📦 styles/styles.css ─► 📦 styles/fonts.css ─► 🆕 fonts/plus-jakarta-sans-*.woff2
 └─► 📦 scripts/scripts.js
       ├─ 📦 aem.js loadHeader ─► 📦 blocks/header/header.js ─► 🆕 scripts/brand.js
       │                                                     └─► 🆕 icons/*.svg (decorateIcons)
       ├─ 📦 aem.js loadFooter ─► 📦 blocks/footer/footer.js ─► 🆕 scripts/brand.js
       └─ 📦 aem.js loadBlock (según la tabla del documento)
            ├─► 🆕 blocks/hero-novamovil ─► 🆕 scripts/block-options.js
            └─► 🆕 blocks/card-categories · card-featured · card-promotions
                   ├─► 🆕 scripts/block-options.js (Styles / Classname, 1.ª línea de decorate)
                   ├─► 🆕 scripts/block-utils.js   (título, celdas, filas balanceadas)
                   ├─► 🆕 scripts/api/http-client.js ─► 🆕 scripts/api/interceptors.js
                   └─► 🆕 scripts/toast.js ─► 🆕 styles/toast.css

📦 404.html ─► 🆕 styles/colors.css
📦 .hlxignore ─► excluye content-drive/, documentation/ y dotfiles de la publicación
```

## En el flujo de contenido (herramientas locales 🔒)

```
🔒 migration-work/docx_builder.py ─► 🆕 content-drive/*.docx ─► (tú) Google Drive ─► sitio
                                            │
🔒 migration-work/docx_to_html.py ◄─────────┘
        └─► 🔒 migration-work/docx-source/*.html
               └─► 🔒 tools/importer/import-docx-pages.bundle.js
                      (+ transformers/novamovil-cleanup.js, novamovil-sections.js)
                      └─► 🔒 content/*.plain.html (panel de Documentos)
```

## Orden de ejecución de un bloque

1. `decorateMain` (📦 `scripts.js`): crea secciones y bloques y convierte enlaces en negrita en botones.
2. `loadBlock` (📦 `aem.js`): carga el CSS y el JS del bloque.
3. JS del bloque (`decorate(block)`):
   1. `applyBlockOptions` (🆕 `block-options.js`), solo bloques NovaMóvil: aplica y quita `Styles` / `Classname`.
   2. Lee sus filas (`Title`, `Endpoint`…) y pinta.
