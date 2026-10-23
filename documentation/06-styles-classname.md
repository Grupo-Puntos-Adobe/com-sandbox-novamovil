# 06 · block-options: Styles, Classname y Session, paso a paso

Esta guía explica **qué hace** `scripts/foundations/block-options.js`, **en qué archivos está**,
**cómo funciona por dentro**, **por qué se hizo así** y **cómo agregarlo a un bloque nuevo**.

Es el **punto de entrada** de las opciones de autor de los bloques NovaMóvil **y de las sesiones**:
`scripts/scripts.js`, `head.html` y `404.html` quedan como el template original.

---

## 1. Qué es

Son filas **opcionales** que el autor puede poner en la tabla de un bloque, en el documento de
Drive, para controlar su espacio, su apariencia y quién lo ve, sin tocar código:

```
┌──────────────────────────────────────────────────────────────────┐
│ Card Promotions                                                  │  ← nombre del bloque
├───────────┬────────────────────────────────────────┬─────────────┤
│ Styles    │ margin-top: 60; margin-bottom: 40      │             │  ← estilos en línea
│ Classname │ dark compact                           │             │  ← clases extra
│ Session   │ true                                   │             │  ← el bloque solo con sesión
│ Title     │ Promociones                            │ signed-out  │  ← esta fila solo sin sesión
│ Title     │ Tus promociones                        │ signed-in   │  ← esta fila solo con sesión
│ Endpoint  │ https://…/api/v1/home/promotions       │             │
└───────────┴────────────────────────────────────────┴─────────────┘
```

| Opción | Dónde | Qué hace |
|---|---|---|
| `Styles` | Fila | Estilos en línea sobre el bloque |
| `Classname` | Fila | Clases extra sobre el bloque |
| `Session` | Fila | `true` = el **bloque completo** solo se ve con sesión; `false` = solo sin sesión; sin la fila o vacía = siempre |
| Estado en la **última columna** | Cualquier fila | `signed-in`, `signed-out` o `guest` (combinables con coma): **esa fila** solo existe para ese estado |
| Regla de la **página** | Metadata de la página | `Session` `true` / `false` + `Redirect To` (la revisa `block-options.js` una vez por página) |

Resultado en la página (con `Styles` y `Classname`):

```html
<div class="card-promotions-wrapper" style="display: flow-root;">
  <div class="card-promotions block dark compact"
       style="margin-top: 60px; margin-bottom: 40px;">
    <div class="card-promotions-header">
      <div class="card-promotions-heading" role="heading" aria-level="2">Promociones</div>
    </div>
    <div class="card-promotions-list" role="list">…tarjetas…</div>
  </div>
</div>
```

- `Styles` y `Classname` se aplican al **elemento principal del bloque** (`.card-promotions`), así
  que **rodean todo el componente**: un `margin-top` queda arriba del título y un `margin-bottom`
  debajo de las tarjetas.
- `Session` oculta el **bloque y su wrapper** (`-wrapper`), para no dejar espacio vacío.
- Todas estas filas (y la celda del estado) **desaparecen**: el resto del bloque nunca las ve.

## 2. Qué bloques la tienen

**Solo los bloques creados para NovaMóvil**, y los que se creen más adelante:

| Bloque | ¿Tiene block-options? |
|---|---|
| `hero-novamovil`, `card-categories`, `card-featured`, `card-promotions` | ✅ Sí |
| `breadcrumb`, `product-catalog`, `product-detail`, `login`, `block-session-example` | ✅ Sí |
| Bloques nuevos que creemos | ✅ Sí, agregando **una línea** (ver sección 7) |
| `cards`, `columns`, `hero`, `fragment`, `widget` (template) | ❌ No. Una fila `Styles` o un estado en la última columna se ven como contenido normal |
| `header`, `footer` | ❌ No |

Es **opcional por bloque** (*opt-in*): la función es compartida, pero cada bloque decide llamarla.

> La regla de la **página** (Metadata `Session`) también arranca desde aquí: corre en cuanto carga
> el primer bloque que usa `block-options`. Una página **sin** estos bloques (solo texto) no la
> revisa y siempre se muestra.

## 3. Archivos involucrados

| Archivo | Origen | Qué tiene |
|---|---|---|
| `scripts/foundations/block-options.js` | 🆕 nuevo | **La función compartida** `applyBlockOptions`, sus ayudantes y el arranque de sesiones |
| `scripts/foundations/session.js` | 🆕 nuevo | Estado de sesión, regla de la página (`guardPage`), filas por sesión (`applySessionRows`) y `setSessionVisibility` |
| `styles/foundations/sessions.css` | 🆕 nuevo | Clases que muestran u ocultan por sesión; lo carga `block-options.js` |
| `scripts/foundations/block-utils.js` | 🆕 nuevo | `buildSectionTitle`: mete el título **dentro** del bloque para que los estilos lo rodeen |
| `blocks/<bloque NovaMóvil>/<bloque>.js` | 🆕 nuevo | `import` + llamada en la 1.ª línea de `decorate` |
| `content-drive/*.docx` | 🆕 nuevo | Cada tabla trae las filas `Styles` y `Classname` vacías, listas para usar |
| 🔒 `migration-work/docx_builder.py` | local | `Doc.options()` genera esas dos filas vacías en cada tabla |
| `scripts/scripts.js`, `head.html`, `404.html` | 📦 template | **Sin cambios** |
| `scripts/aem.js` | 📦 template | **Sin cambios.** Nunca se edita (de aquí se usa `loadCSS`) |

## 4. Cómo se conecta con el template (orden de ejecución)

AEM Edge Delivery carga cada página así. Lo nuestro está marcado con 🆕:

```
1. 📦 scripts/scripts.js → decorateMain(main)
      ├─ decorateSections   → crea las secciones (div.section)
      ├─ decorateBlocks     → cada tabla se vuelve div.<nombre>.block
      └─ decorateButtons    → enlaces en negrita → botones
2. 📦 scripts/aem.js → loadBlock(block)   (la sección no se muestra hasta que sus bloques terminan)
      ├─ carga blocks/<nombre>/<nombre>.css
      └─ importa blocks/<nombre>/<nombre>.js
           └─ 🆕 import block-options.js   ← SOLO LA PRIMERA VEZ en la página:
                ├─ await loadCSS(sessions.css)
                └─ guardPage()               ← Metadata Session / Redirect To; si no acepta al
                                               visitante: oculta la página y redirige
3. 🆕 decorate(block) del bloque
      ├─ 🆕 applyBlockOptions(block)   ← PRIMERA línea:
      │     ├─ página redirigiendo → vacía el bloque y termina
      │     ├─ applySessionRows(block) → quita las filas de otros estados (última columna)
      │     └─ lee, aplica y QUITA Styles / Classname / Session
      ├─    readTableCell(…)           ← ya no ve esas filas
      ├─    buildSectionTitle(block, …) ← título dentro del bloque
      └─    pinta tarjetas / hero / …
```

Por qué **primera línea**: si se llamara después, el bloque podría confundir la fila `Styles` (o
una fila de otro estado) con contenido.

Por qué la regla de la página va al **importar** el módulo: el primer bloque de la página carga
antes de que se muestre su sección, así que la página que debe redirigir no llega a verse.

## 5. El código, explicado

Archivo: `scripts/foundations/block-options.js`.

### 5.1 Arranque de sesiones (una vez por página)

```js
await loadCSS(`${window.hlx?.codeBasePath || ''}/styles/foundations/sessions.css`);
const pageAccepted = guardPage();
if (!pageAccepted) document.body.style.visibility = 'hidden';
```

- `await` al nivel del módulo: el bloque no se decora hasta que `sessions.css` ya cargó, así que lo
  que debe estar oculto nunca se ve un instante.
- `guardPage()` (de `session.js`) lee el Metadata de la página: `Session` `true` (solo con sesión),
  `false` (solo sin sesión) o vacía (pública), y `Redirect To` (por defecto el home). Ver
  `documentation/08-sesiones.md`.
- Como es un módulo, esto corre **una sola vez** aunque la página tenga muchos bloques.

### 5.2 Constantes

```js
const STYLE_KEYS = ['styles', 'style'];
const SESSION_KEYS = ['session'];
const BLOCK_SESSION_STATES = {
  true: [SESSION_STATES.SIGNED_IN],                         // solo con sesión
  false: [SESSION_STATES.SIGNED_OUT, SESSION_STATES.GUEST], // solo sin sesión (invitado = sin sesión)
};
const CLASS_KEYS = ['classname', 'classnames', 'class name', 'class names', 'class'];
const PROPERTY = /^-{0,2}[a-z][a-z0-9-]*$/i;       // nombre de propiedad CSS válido (o --variable)
const CLASS_NAME = /^-?[_a-z][_a-z0-9-]*$/i;        // nombre de clase válido
const UNSAFE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|[<>{}]/i;
const BARE_NUMBER = /^-?\d*\.?\d+$/;                // "60", "-4", ".5"
```

- El nombre de la fila **no distingue mayúsculas** y acepta variantes (`Style`, `Class name`…),
  porque los autores escriben distinto. `TRUE` = `true`.
- `UNSAFE_VALUE` bloquea valores que podrían cargar recursos externos o inyectar código
  (`url(…)`, `javascript:`, `@import`, `<`, `>`, `{`, `}`).

### 5.3 `applyAuthorStyles(block, declarations)`

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

Paso a paso:
1. Separa por `;` (no por coma, porque la coma es parte de valores como `rgba(0, 0, 0, .5)`).
2. Cada declaración debe tener la forma `propiedad: valor`.
3. Descarta propiedades inválidas y valores inseguros. **Lo inválido se ignora en silencio**.
4. Usa `style.setProperty`: si el valor no es CSS válido, el navegador no lo aplica.
5. Si el navegador rechazó un número solo (`60`), lo reintenta como `60px`.

También respeta `!important` y variables CSS (`--card-promotions-item-color: #f00`).

### 5.4 `applyAuthorClasses(block, names)`

```js
export function applyAuthorClasses(block, names) {
  String(names || '')
    .split(/[\s,;]+/)                       // separa por espacios, comas o ";"
    .map((name) => name.trim())
    .filter((name) => CLASS_NAME.test(name)) // solo nombres de clase válidos
    .forEach((name) => block.classList.add(name));
}
```

`dark compact` o `dark, compact` agregan `dark` y `compact`. Un nombre inválido (`1abc`, `a.b`) se
ignora.

### 5.5 `applyBlockOptions(block)` (la que llaman los bloques)

```js
export default function applyBlockOptions(block) {
  if (!pageAccepted) {            // la página está redirigiendo: no hay nada que mostrar
    block.replaceChildren();
    return;
  }
  applySessionRows(block);        // filas con el estado en la última columna
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const [keyCell, valueCell, ...extraCells] = row.children;
    if (!keyCell || !valueCell || extraCells.some((cell) => cell.textContent.trim())) return;
    const key = keyCell.textContent.trim().toLowerCase();
    if (STYLE_KEYS.includes(key)) { … applyAuthorStyles + flow-root … row.remove(); }
    else if (CLASS_KEYS.includes(key)) { applyAuthorClasses(…); row.remove(); }
    else if (SESSION_KEYS.includes(key)) {
      const states = BLOCK_SESSION_STATES[valueCell.textContent.trim().toLowerCase()];
      if (states) setSessionVisibility(wrapperOrBlock, states);   // true / false
      row.remove();                                               // vacía: siempre se ve
    }
  });
}
```

- Recorre **todas** las filas, así que las opciones pueden ir en cualquier posición (lo normal es
  justo después del nombre del bloque).
- Si una fila no existe, no pasa nada: todas son opcionales. Si existe pero está vacía, se quita y
  no aplica nada.
- Usa `textContent`: aunque el autor ponga negritas o enlaces en la celda, solo se lee el texto.

### 5.6 Filas por sesión: `applySessionRows(block)` (de `session.js`)

Una fila de **2 o más columnas** cuya **última celda** es **solo** un estado:

| Última celda | La fila existe para |
|---|---|
| `signed-in` | Quien tiene sesión |
| `signed-out` | Quien no tiene sesión |
| `guest` | Quien entró como invitado |
| `signed-in, guest` (combinados con coma) | Cualquiera de los dos |
| vacía, o texto que no es solo estados | Todos (la fila no se toca) |

- Las filas de otros estados se **quitan antes** de que el bloque lea su tabla; a las que quedan
  se les quita la celda del estado. El bloque lee `Title` como siempre: **no cambia su código**.
- Funciona igual con 2, 3 o n columnas: siempre decide la **última**.
- Si la sesión cambia en la misma página (iniciar sesión, invitado, cerrar sesión), la página se
  recarga para mostrar las filas del nuevo estado.

## 6. Decisiones importantes (el porqué)

### 6.1 El título va dentro del bloque

Antes, el título ("Categorías", "Productos destacados") era contenido suelto **fuera** de la tabla,
y los estilos quedaban **entre el título y las tarjetas**. Ahora cada bloque lee una fila `Title` y
la pinta dentro con `buildSectionTitle` de `scripts/foundations/block-utils.js`:

```
Antes:  section > [h2 Categorías] + [div.card-categories ← estilos aquí]
Ahora:  section > [div.card-categories ← estilos aquí > título Categorías + tarjetas]
```

### 6.2 `display: flow-root` (márgenes que no se pierden)

En CSS, cuando dos márgenes verticales se tocan se **fusionan** (*margin collapsing*) y solo cuenta
el mayor. Las secciones del template tienen `margin: 40px 0` (`styles/styles.css`), así que un
`margin-top: 60` en el bloque solo sumaba 20 px.

`display: flow-root` en el contenedor del bloque (`div.card-promotions-wrapper`) impide la fusión.
Se aplica **solo si el autor puso estilos**, así que la página sin filas se ve igual que antes.

| Bloque | Arriba del título | Debajo del contenido | Entre título y tarjetas |
|---|---|---|---|
| hero-novamovil, card-categories, card-featured, card-promotions | +60 px | +40 px | sin cambio |

### 6.3 Seguridad

- Nunca se usa `innerHTML` ni `cssText` con lo que escribe el autor.
- Las propiedades y clases se validan con expresiones regulares.
- Los valores con `url(`, `expression(`, `javascript:`, `@import` o `< > { }` se descartan.
- **Ocultar por sesión no es proteger**: el HTML es público. Los datos privados llegan solo del
  servicio con el token (`REQUEST_TYPE.PRIVATE`).

### 6.4 Una sola función compartida

La lógica vive **una sola vez** en `scripts/foundations/block-options.js`. Si mañana se agrega una
opción nueva, se cambia en un solo archivo y la tienen todos los bloques que la usan.

### 6.5 Las sesiones arrancan aquí, no en `scripts.js`

Para poder llevar todo a otro proyecto **sin tocar `scripts.js` ni `head.html`**, `block-options.js`
carga `sessions.css` y revisa la regla de la página. Lo que cuesta:

- Una página sin bloques NovaMóvil no revisa su regla de `Session` (siempre se muestra).
- Los bloques del template (`cards`, `columns`…) no tienen filas por sesión.

## 7. Cómo agregarla a un bloque nuevo

En `blocks/<nuevo-bloque>/<nuevo-bloque>.js`:

```js
import applyBlockOptions from '../../scripts/foundations/block-options.js';

export default function decorate(block) {
  applyBlockOptions(block); // optional Styles / Classname / Session rows, before reading
  // … el resto del bloque …
}
```

Con esa línea el bloque ya tiene `Styles`, `Classname`, `Session`, las filas por sesión (última
columna) y hace que la página revise su regla de sesión.

Si el bloque tiene título, usar `buildSectionTitle(block, '<nuevo-bloque>')` de
`scripts/foundations/block-utils.js` para que quede dentro del bloque.

En el documento (`docx_builder.py` → `Doc.options()`), poner las filas vacías justo después del
nombre:

```python
d.table("Nuevo Bloque", d.options() + [ …resto de filas… ])
```

## 8. Ejemplos de uso para autores

| Quiero… | Fila / celda | Valor |
|---|---|---|
| Más espacio arriba | `Styles` | `margin-top: 60` |
| Más espacio abajo | `Styles` | `margin-bottom: 40` |
| Quitar el espacio de arriba | `Styles` | `margin-top: 0` |
| Relleno a los lados | `Styles` | `padding-left: 20; padding-right: 20` |
| Cambiar una variable de color del bloque | `Styles` | `--card-promotions-item-color: #059669` |
| Forzar un valor | `Styles` | `margin-top: 0 !important` |
| Agregar clases para estilos futuros | `Classname` | `dark compact` |
| Que el bloque solo se vea con sesión | `Session` | `true` |
| Que el bloque se oculte al iniciar sesión (p. ej. "Inicia sesión") | `Session` | `false` |
| Un título distinto con y sin sesión | Última columna de cada fila `Title` | `signed-in` / `signed-out` |
| Un beneficio solo para invitados o sin sesión | Última columna de la fila | `guest, signed-out` |

Lo que **no** funciona (se ignora a propósito): `background: url(foto.jpg)`, `color: red; } body {…`,
propiedades inventadas, valores inválidos, o una última celda con texto además del estado
("guest y otra palabra").

## 9. Historia del cambio

| Commit | Qué pasó |
|---|---|
| `dc91d2b` | Primera versión: se llamaba **para todos los bloques** desde `decorateMain` en 📦 `scripts/scripts.js` |
| `b6495eb` | El título pasa a estar dentro del bloque (`buildSectionTitle`) y se agrega `flow-root` para los márgenes |
| `5e0f0b5` | **Solo bloques NovaMóvil:** se quita la llamada de `scripts/scripts.js` (vuelve a quedar **idéntico al template**) |
| `7a7b64b` | Se agrega la fila `Session` (quién ve el bloque) |
| `99104c0` | Filas por sesión: el estado en la última columna |
| `1ef6a22` | `Session` del bloque pasa a `true` / `false` |
| `13a22ae` | **Sesiones desde aquí:** `block-options.js` carga `sessions.css` y revisa la regla de la página; `scripts.js`, `head.html` y `404.html` vuelven a ser los originales |

## 10. Cómo probarlo

1. En Drive, en la tabla de un bloque NovaMóvil, escribir en `Styles`: `margin-top: 60; margin-bottom: 40`.
2. Preview del documento.
3. En el navegador, inspeccionar el bloque: debe tener `style="margin-top: 60px; margin-bottom: 40px;"`
   y su contenedor `-wrapper` `style="display: flow-root;"`. Las filas `Styles`/`Classname` no deben
   verse.
4. **Session:** con `Session` = `true`, el bloque no se ve sin sesión y aparece al iniciar sesión;
   con `false`, al revés.
5. **Filas por sesión:** dos filas `Title` con `signed-out` y `signed-in` en la última columna: sin
   sesión se ve una y con sesión la otra (la página se recarga sola al cambiar la sesión).
6. En un bloque del template (por ejemplo `Columns`), las mismas filas se ven como contenido. Así
   debe ser.

Página de prueba con todo: `content-drive/ejemplo-sesion.docx` (bloque `block-session-example`).

## 11. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La fila `Styles` se ve como texto en la página | El bloque no llama a `applyBlockOptions` (bloque del template o bloque nuevo sin la línea) | Agregar la llamada (sección 7) |
| El estilo no se aplica | Valor inválido o bloqueado por seguridad | Revisar la escritura: `propiedad: valor; propiedad: valor` |
| El margen no se nota | Se escribió con coma en lugar de `;` | Separar las declaraciones con `;` |
| `Session` no oculta el bloque | El valor no es `true` ni `false` (por ejemplo `si`) | Escribir `true` o `false` |
| Una fila por sesión siempre se ve | La última celda trae más texto que el estado, o el estado no está en la **última** columna | Dejar en la última celda solo `signed-in`, `signed-out` o `guest` |
| La página privada no redirige | La página no tiene ningún bloque NovaMóvil | Agregar un bloque NovaMóvil (por ejemplo `Breadcrumb`) |
| El título queda fuera del margen | El documento de Drive tiene el título fuera de la tabla (versión anterior) | Poner el título en la fila `Title` |
