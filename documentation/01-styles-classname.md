# 01 · Funcionalidad Styles y Classname: cómo se agregó, paso a paso

Esta guía explica **qué hace**, **en qué archivos está**, **cómo funciona por dentro**, **por qué se
hizo así** y **cómo agregarla a un bloque nuevo**.

---

## 1. Qué es

Son dos filas **opcionales** que el autor puede poner en la tabla de un bloque, en el documento de
Drive, para controlar su espacio y su apariencia sin tocar código:

```
┌────────────────────────────────────────────────────┐
│ Card Promotions                                    │  ← nombre del bloque
├───────────┬────────────────────────────────────────┤
│ Styles    │ margin-top: 60; margin-bottom: 40      │  ← opcional: estilos en línea
│ Classname │ dark compact                           │  ← opcional: clases extra
│ Title     │ Promociones                            │
│ Endpoint  │ https://…/api/v1/home/promotions       │
└───────────┴────────────────────────────────────────┘
```

Resultado en la página:

```html
<div class="card-promotions block dark compact"
     style="margin-top: 60px; margin-bottom: 40px;">
  <div class="card-promotions-header">
    <div class="card-promotions-heading" role="heading" aria-level="2">Promociones</div>
  </div>
  <div class="card-promotions-list" role="list">…tarjetas…</div>
</div>
```

- Se aplican al **elemento principal del bloque** (el que tiene la clase `.card-promotions`).
- Por eso **rodean todo el componente**: un `margin-top` queda **arriba del título** y un
  `margin-bottom` queda **debajo de las tarjetas**. Nunca entre el título y las tarjetas.
- Las filas **desaparecen** de la página; el resto del bloque nunca las ve.

## 2. Qué bloques la tienen

**Solo los bloques creados para NovaMóvil**, y los que se creen más adelante:

| Bloque | ¿Tiene Styles / Classname? |
|---|---|
| `hero-novamovil` | ✅ Sí |
| `card-categories` | ✅ Sí |
| `card-featured` | ✅ Sí |
| `card-promotions` | ✅ Sí |
| Bloques nuevos que creemos | ✅ Sí, agregando **una línea** (ver sección 7) |
| `cards`, `columns`, `hero`, `fragment`, `widget` (template) | ❌ No. Si un autor pone la fila, se ve como una fila de contenido normal |
| `header`, `footer` | ❌ No |

Es **opcional por bloque** (*opt-in*): la función es compartida, pero cada bloque decide llamarla.

## 3. Archivos involucrados

| Archivo | Origen | Qué tiene |
|---|---|---|
| `scripts/block-options.js` | 🆕 nuevo | **La función compartida** `applyBlockOptions` y sus dos ayudantes |
| `blocks/hero-novamovil/hero-novamovil.js` | 🆕 nuevo | `import` + llamada en la 1.ª línea de `decorate` |
| `blocks/card-categories/card-categories.js` | 🆕 nuevo | Igual |
| `blocks/card-featured/card-featured.js` | 🆕 nuevo | Igual |
| `blocks/card-promotions/card-promotions.js` | 🆕 nuevo | Igual |
| `scripts/block-utils.js` | 🆕 nuevo | `buildSectionTitle`: mete el título **dentro** del bloque para que los estilos lo rodeen |
| `content-drive/index.docx` | 🆕 nuevo | Cada tabla trae las filas `Styles` y `Classname` vacías, listas para usar |
| 🔒 `migration-work/docx_builder.py` | local | `Doc.options()` genera esas dos filas vacías en cada tabla |
| `scripts/scripts.js` | 📦 template | **Sin cambios.** Ver sección 9 (historia) |
| `scripts/aem.js` | 📦 template | **Sin cambios.** Nunca se edita |

## 4. Cómo se conecta con el template (orden de ejecución)

AEM Edge Delivery carga cada página así. Lo nuestro está marcado con 🆕:

```
1. 📦 scripts/scripts.js → decorateMain(main)
      ├─ decorateSections   → crea las secciones (div.section)
      ├─ decorateBlocks     → cada tabla se vuelve div.<nombre>.block
      └─ decorateButtons    → enlaces en negrita → botones
2. 📦 scripts/aem.js → loadBlock(block)
      ├─ carga blocks/<nombre>/<nombre>.css
      └─ importa blocks/<nombre>/<nombre>.js y ejecuta decorate(block)
3. 🆕 decorate(block) del bloque
      ├─ 🆕 applyBlockOptions(block)   ← PRIMERA línea: lee, aplica y QUITA Styles/Classname
      ├─    readBlockConfig(block)      ← ya no ve esas filas
      ├─    buildSectionTitle(block, …) ← título dentro del bloque
      └─    pinta tarjetas / hero
```

Por qué **primera línea**: si se llamara después, el bloque podría confundir la fila `Styles` con
contenido (por ejemplo, el hero busca "la celda con texto" y encontraría `Styles`).

## 5. El código, explicado

Archivo: `scripts/block-options.js`.

### 5.1 Constantes

```js
const STYLE_KEYS = ['styles', 'style'];
const CLASS_KEYS = ['classname', 'classnames', 'class name', 'class names', 'class'];
const PROPERTY = /^-{0,2}[a-z][a-z0-9-]*$/i;       // nombre de propiedad CSS válido (o --variable)
const CLASS_NAME = /^-?[_a-z][_a-z0-9-]*$/i;        // nombre de clase válido
const UNSAFE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|[<>{}]/i;
const BARE_NUMBER = /^-?\d*\.?\d+$/;                // "60", "-4", ".5"
```

- El nombre de la fila **no distingue mayúsculas** y acepta variantes (`Style`, `Class name`…),
  porque los autores escriben distinto.
- `UNSAFE_VALUE` bloquea valores que podrían cargar recursos externos o inyectar código
  (`url(…)`, `javascript:`, `@import`, `<`, `>`, `{`, `}`).

### 5.2 `applyAuthorStyles(block, declarations)`

```js
export function applyAuthorStyles(block, declarations) {
  String(declarations || '')
    .split(/;|\n/)                          // 1. separa por ";" o salto de línea
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 1) return;            // 2. sin "propiedad:" → se ignora
      const property = declaration.slice(0, separator).trim().toLowerCase();
      let value = declaration.slice(separator + 1).trim();
      if (!PROPERTY.test(property) || !value || UNSAFE_VALUE.test(value)) return; // 3. validación
      const important = /!important$/i.test(value);
      value = value.replace(/\s*!important$/i, '');

      block.style.setProperty(property, value, important ? 'important' : ''); // 4. aplica
      // 5. número sin unidad → reintenta con px (margin-top: 60 → 60px)
      if (!block.style.getPropertyValue(property) && BARE_NUMBER.test(value)) {
        block.style.setProperty(property, `${value}px`, important ? 'important' : '');
      }
    });
}
```

Recibe el mismo `block` que llega a `decorate(block)` (se lo pasa `applyBlockOptions`).

Paso a paso:
1. Separa por `;` (no por coma, porque la coma es parte de valores como `rgba(0, 0, 0, .5)`).
2. Cada declaración debe tener la forma `propiedad: valor`.
3. Descarta propiedades inválidas y valores inseguros. **Lo inválido se ignora en silencio**; nunca
   rompe la página.
4. Usa `style.setProperty`, que es el propio navegador validando: si el valor no es CSS válido,
   simplemente no se aplica.
5. Si el navegador rechazó un número solo (`60`), lo reintenta como `60px`. Así el autor puede
   escribir `margin-top: 60`.

También respeta `!important` y variables CSS (`--card-promotions-item-color: #f00`).

### 5.3 `applyAuthorClasses(block, names)`

```js
export function applyAuthorClasses(block, names) {
  String(names || '')
    .split(/[\s,]+/)                        // separa por espacios o comas
    .map((name) => name.trim())
    .filter((name) => CLASS_NAME.test(name)) // solo nombres de clase válidos
    .forEach((name) => block.classList.add(name));
}
```

`dark compact` o `dark, compact` agregan `dark` y `compact`. Un nombre inválido (`1abc`, `a.b`) se ignora.

### 5.4 `applyBlockOptions(block)` (la que llaman los bloques)

```js
export default function applyBlockOptions(block) {
  [...block.querySelectorAll(':scope > div')].forEach((row) => {   // cada fila de la tabla
    const [keyCell, valueCell, ...extraCells] = row.children;
    // nombre | valor; se aceptan más celdas solo si están vacías (tablas de 3+ columnas,
    // como el hero con sus filas Stat N)
    if (!keyCell || !valueCell || extraCells.some((cell) => cell.textContent.trim())) return;
    const key = keyCell.textContent.trim().toLowerCase();
    if (STYLE_KEYS.includes(key)) {
      applyAuthorStyles(block, valueCell.textContent);
      // los márgenes se suman al espacio de la sección en vez de "juntarse" con él
      if (block.getAttribute('style') && block.parentElement) {
        block.parentElement.style.display = 'flow-root';
      }
      row.remove();
    } else if (CLASS_KEYS.includes(key)) {
      applyAuthorClasses(block, valueCell.textContent);
      row.remove();
    }
  });
}
```

- Recorre **todas** las filas, así que `Styles` y `Classname` pueden ir en cualquier posición
  (lo normal es justo después del nombre del bloque).
- Si una fila no existe, no pasa nada: ambas son opcionales.
- Si la fila existe pero está vacía, se quita igual y no aplica nada.
- Usa `textContent`, así que aunque el autor ponga negritas o enlaces en la celda, solo se lee el texto.

## 6. Decisiones importantes (el porqué)

### 6.1 El título va dentro del bloque

Antes, el título ("Categorías", "Productos destacados") era contenido suelto **fuera** de la tabla,
y los estilos quedaban **entre el título y las tarjetas**. Ahora cada bloque lee una fila `Title`
y la pinta dentro con `buildSectionTitle` de `scripts/block-utils.js` (destacados agrega su botón
`Link`, "Ver todos", con su propia función `buildViewAllLink`):

```
Antes:  section > [h2 Categorías] + [div.card-categories ← estilos aquí]
Ahora:  section > [div.card-categories ← estilos aquí > título Categorías + tarjetas]
```

### 6.2 `display: flow-root` (márgenes que no se pierden)

En CSS, cuando dos márgenes verticales se tocan se **fusionan** (*margin collapsing*) y solo cuenta el
mayor. Las secciones del template tienen `margin: 40px 0` (`styles/styles.css`), así que un
`margin-top: 60` en el bloque solo sumaba 20 px, y un `margin-bottom: 40` sumaba 0.

`display: flow-root` en el contenedor del bloque (`div.card-promotions-wrapper`) crea un nuevo
contexto de formato, lo que impide la fusión. Se aplica **solo si el autor puso estilos**, así que
la página sin filas se ve exactamente igual que antes.

Medido en la vista previa con `margin-top: 60; margin-bottom: 40`:

| Bloque | Arriba del título | Debajo del contenido | Entre título y tarjetas |
|---|---|---|---|
| hero-novamovil, card-categories, card-featured, card-promotions | +60 px | +40 px | sin cambio |

### 6.3 Seguridad

- Nunca se usa `innerHTML` ni `cssText` con lo que escribe el autor.
- Las propiedades y clases se validan con expresiones regulares.
- Los valores con `url(`, `expression(`, `javascript:`, `@import` o `< > { }` se descartan.

### 6.4 Una sola función compartida

La lógica vive **una sola vez** en `scripts/block-options.js`. Los bloques solo la importan. Si mañana
se agrega una opción nueva (por ejemplo una fila `Id`), se cambia en un solo archivo y la tienen
todos los bloques que la usan.

## 7. Cómo agregarla a un bloque nuevo

En `blocks/<nuevo-bloque>/<nuevo-bloque>.js`:

```js
import applyBlockOptions from '../../scripts/block-options.js';

export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname rows, before reading the config
  // … el resto del bloque …
}
```

Si el bloque tiene título, usar `buildSectionTitle(block, '<nuevo-bloque>')` de
`scripts/block-utils.js` para que quede dentro del bloque.

En el documento (`docx_builder.py` → `Doc.options()`), poner las filas vacías justo después del nombre:

```python
d.table("Nuevo Bloque", d.options() + [ …resto de filas… ])
```

## 8. Ejemplos de uso para autores

| Quiero… | Styles | Classname |
|---|---|---|
| Más espacio arriba | `margin-top: 60` | |
| Más espacio abajo | `margin-bottom: 40` | |
| Quitar el espacio de arriba | `margin-top: 0` | |
| Relleno a los lados | `padding-left: 20; padding-right: 20` | |
| Cambiar el color de una variable del bloque | `--card-promotions-item-color: #059669` | |
| Forzar un valor | `margin-top: 0 !important` | |
| Agregar clases para estilos futuros | | `dark compact` |

Lo que **no** funciona (se ignora a propósito): `background: url(foto.jpg)`, `color: red; } body {…`,
propiedades inventadas o valores inválidos.

## 9. Historia del cambio

| Commit | Qué pasó |
|---|---|
| `dc91d2b` | Primera versión: se llamaba **para todos los bloques** desde `decorateMain` en 📦 `scripts/scripts.js` |
| `b6495eb` | El título pasa a estar dentro del bloque (`buildBlockHeader`, hoy `buildSectionTitle`) y se agrega `flow-root` para los márgenes |
| `5e0f0b5` | **Solo bloques NovaMóvil:** se quita la llamada de `scripts/scripts.js` (vuelve a quedar **idéntico al template**) y cada bloque NovaMóvil la llama en la primera línea de su `decorate` |

Por qué se cambió: así los bloques del template (`cards`, `columns`, `hero`…) quedan intactos, y
`scripts/scripts.js` vuelve a ser el archivo original, lo que facilita actualizar el template en el futuro.

## 10. Cómo probarlo

1. En Drive, en la tabla de un bloque NovaMóvil, escribir en `Styles`: `margin-top: 60; margin-bottom: 40`.
2. Preview del documento.
3. En el navegador, inspeccionar el bloque: debe tener `style="margin-top: 60px; margin-bottom: 40px;"`
   y su contenedor `-wrapper` `style="display: flow-root;"`. Las filas `Styles`/`Classname` no deben verse.
4. En un bloque del template (por ejemplo `Columns`), la misma fila se ve como contenido y no aplica
   estilos. Así debe ser.

## 11. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La fila `Styles` se ve como texto en la página | El bloque no llama a `applyBlockOptions` (bloque del template o bloque nuevo sin la línea) | Agregar la llamada (sección 7) |
| El estilo no se aplica | Valor inválido o bloqueado por seguridad | Revisar la escritura: `propiedad: valor; propiedad: valor` |
| El margen no se nota | Se escribió con coma en lugar de `;` | Separar las declaraciones con `;` |
| El título queda fuera del margen | El documento de Drive tiene el título fuera de la tabla (versión anterior) | Subir el `index.docx` actual y poner el título en la fila `Title` |
