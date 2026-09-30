# 07 · Archivos del template sin cambios

📦 Archivos base del AEM Boilerplate que siguen **exactamente** como en `913a1df`.

| Archivo / carpeta | Nota |
|---|---|
| `scripts/aem.js` | Núcleo de AEM. **Nunca se edita** |
| `scripts/scripts.js` | Se modificó y luego se revirtió; hoy es idéntico al template (ver 01 y 08) |
| `scripts/consent-check.js`, `scripts/consented.js` | Carga condicionada al consentimiento (cookies) |
| `styles/lazy-styles.css` | Estilos que se cargan después |
| `sync-block-collection.sh` | Script del template para traer bloques de la Block Collection |
| `blocks/hero/` | Hero original; se restauró tras crear `hero-novamovil` |
| `blocks/cards/cards.js` | Solo cambió `cards.css` (ver 01) |
| `blocks/columns/` | Columnas |
| `blocks/fragment/` | Fragmentos (lo usan header y footer para leer `nav` y `footer`) |
| `blocks/widget/` | Widget del template |
| `package.json`, `package-lock.json` | Dependencias de desarrollo |
| `.eslintrc.js`, `.eslintignore`, `.stylelintrc.json`, `.editorconfig` | Configuración de lint |
| `.gitignore`, `.renovaterc.json`, `.github/` | Configuración del repositorio |
| `AGENTS.md`, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE` | Documentos del template |
| `favicon.ico`, `icons/search.svg` | Recursos del template |

Comprobación: `git diff --name-status 913a1df HEAD` solo lista los archivos de 01, 02 y 03.
