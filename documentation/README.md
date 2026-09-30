# Documentación de cambios · NovaMóvil (AEM Edge Delivery Services)

Inventario de **todos** los archivos que se han creado, modificado o eliminado en el proyecto,
incluidos los que **no se suben a git**. Sirve para entender qué es del template original y qué
es nuestro, y en qué parte del template influye cada cosa.

- **Base de comparación:** commit `913a1df` "First Commit" (22-09-2026) = **AEM Boilerplate**
  (`@adobe/aem-boilerplate` 1.3.0) tal como vino, incluido el bloque `widget`.
- **Actualizado a:** rama `feature/promotions` (30-09-2026).
- Esta carpeta **no se publica en el sitio** (`documentation/` y `*.md` están en `.hlxignore`).

## Leyenda

| Icono | Significado |
|---|---|
| 📦 | Archivo **base del template** (venía en el boilerplate) |
| 🆕 | Archivo **creado nuevo** por nosotros |
| ✏️ | Modificado |
| 🗑️ | Eliminado |
| 🔒 | **Solo local**: no se sube a git |

## Resumen en números

| Tipo | Cantidad |
|---|---|
| 📦 ✏️ Archivos base modificados | 11 |
| 📦 🗑️ Archivos base eliminados | 4 |
| 🆕 Archivos nuevos en git (código, fuentes, iconos, docx) | 32 |
| 🆕 Archivos nuevos de esta documentación | 8 |
| 🔒 Archivos solo locales | 95 (+ `node_modules/`) |

## Índice

| Archivo | Contenido |
|---|---|
| [01-template-modificados.md](01-template-modificados.md) | Archivos base del template que cambiamos o eliminamos |
| [02-archivos-nuevos.md](02-archivos-nuevos.md) | Archivos nuevos que sí van en git (bloques, scripts, estilos, fuentes, iconos) |
| [03-contenido.md](03-contenido.md) | Documentos `.docx` para Drive y páginas del panel de Documentos |
| [04-archivos-locales.md](04-archivos-locales.md) | 🔒 Todo lo que no se sube a git |
| [05-fuera-del-repo.md](05-fuera-del-repo.md) | Cambios que no son archivos: configuración del sitio y ramas |
| [06-mapa-del-template.md](06-mapa-del-template.md) | Cómo se conecta cada archivo nuevo con el template |
| [07-sin-cambios.md](07-sin-cambios.md) | Archivos del template que siguen tal como vinieron |

## Reglas del proyecto (resumen)

- `scripts/aem.js` **nunca se edita** (es del template).
- Cada bloque tiene una clase principal igual a su nombre y todos sus estilos anidados dentro.
- Los colores salen **solo** de variables de `styles/colors.css`.
- Cada vez que cambia el contenido se actualizan juntos `content-drive/*.docx` y el panel de Documentos.
- Cada vez que se agrega, modifica o borra un archivo (de git o local), se actualiza esta carpeta.
