# 05 · Cambios fuera del repositorio (no son archivos)

## Configuración del sitio en AEM (tools.aem.live)

| Cambio | Detalle |
|---|---|
| URL del código | Corregida a `https://github.com/grupo-puntos-adobe/com-sandbox-novamovil` |
| Fuente de contenido | Cambiada de Document Authoring a **Google Drive** (carpeta `1hGd_5sBgj2o8bx54K-XYweI-c4ss-6Mf`) |

`fstab.yaml`, `helix-query.yaml` y `paths.json` ya no se usan: la configuración vive en tools.aem.live.

## Ramas en GitHub

Cada rama parte de la anterior y lleva todo lo previo. Las copias sin barra (`feature-xxx`) existen
porque la vista previa de aem.page no admite `/` en el nombre de rama.

| Rama | Copia para vista previa | Contenido |
|---|---|---|
| `feature/header` | `feature-header` | Header NovaMóvil, colores, fuentes, documentos de Drive |
| `feature/footer` | `feature-footer` | + Footer |
| `feature/hero` | `feature-hero` | + Hero Novamovil |
| `feature/categories` | `feature-categories` | + Card Categories, cliente HTTP, alerta flotante |
| `feature/highlights` | `feature-highlights` | + Card Featured |
| `feature/promotions` | `feature-promotions` | + Card Promotions, header fijo, Styles/Classname, esta documentación |

Vista previa: `https://feature-promotions--com-sandbox-novamovil--grupo-puntos-adobe.aem.page/`

## Pendientes fuera del repo

- Subir el último `content-drive/index.docx` a Drive y darle Preview.
- Guardar en Postman el ejemplo de `/api/v1/products/featured` (hoy responde 404).
- Renovar las credenciales de Adobe en Settings → LLM Permissions para sincronizar manualmente.
