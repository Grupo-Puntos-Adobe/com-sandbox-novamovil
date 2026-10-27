# Foundations · Breakpoints, Grid, sesiones y alerta

Bases de CSS **portables**: copias la carpeta `foundations/` a cualquier proyecto y funcionan
igual. Son el par de `scripts/foundations/` (JavaScript, ver su `README.md`).

## Resumen: para qué es cada archivo

| Archivo | Para qué es | Qué te da | Necesita |
|---|---|---|---|
| [`breakpoints.css`](#1-las-3-resoluciones) | Tener las **3 resoluciones** del sitio con nombre, para no repetir números en cada CSS | 6 nombres para `@container style(…)`: `--mobile`, `--tablet`, `--desktop`, `--mobile-tablet`, `--tablet-desktop`, `--mobile-desktop` | Nada (solo CSS) |
| [`grid.css`](#8-grid-gridcss) | Acomodar el contenido en **columnas de 24 partes** que cambian por resolución | `container`, `container-fluid`, `row` (con alineación y gutters) y `col-*` (`sm`, `md`, `lg`), con offset y orden | `breakpoints.css` antes |
| [`sessions.css`](#9-sesiones-sessionscss) | **Mostrar u ocultar** cualquier elemento según quién visita (con sesión, invitado, sin sesión) | `session-only` + `session-only-signed-in` / `-guest` / `-signed-out`. Solo visibilidad: sin colores ni tamaños | `scripts/foundations/session.js` (pone `session-state-*` en `<html>` y carga este CSS) |
| [`toast.css`](#10-alerta-toastcss) | Los estilos de la **alerta flotante** | `toast-novamovil` y sus variantes (`-error`, `-warning`, `-success`, `-info`) | `scripts/foundations/toast.js` (lo carga) y las variables `--toast-*`, `--z-index-toast`, `--nav-height` |
| `store.css` | Que un texto con una marca del store (`{store.breadcrumb.name}`) **espere oculto** hasta tener su valor | `[data-store-pending]` (lo pone `store.js`, nunca a mano) | `scripts/foundations/store.js` (lo carga) |

`breakpoints.css` y `grid.css` son solo CSS: no necesitan JavaScript, Sass, PostCSS ni paso de
build. `sessions.css` y `toast.css` son el CSS de `scripts/foundations/` (sesiones y alerta) y los
carga su JavaScript.

### Cómo se carga cada uno

| Archivo | Dónde se carga | Cuándo |
|---|---|---|
| `breakpoints.css` | `head.html` (y `404.html`) | Siempre, **antes** del resto del CSS |
| `grid.css` | `head.html` (y `404.html`) | Siempre, justo después de `breakpoints.css` |
| `sessions.css` | `scripts/foundations/session.js` (`initPageSession`) | En todas las páginas, antes de `scripts.js` |
| `toast.css` | `scripts/foundations/toast.js` (`loadCSS`) | La primera vez que se muestra una alerta |
| `store.css` | `scripts/foundations/store.js` | En todas las páginas: oculta el elemento cuya marca `{apartado.variable}` todavía no tiene valor (`[data-store-pending]`) |

---

## 1. Las 3 resoluciones

| Nombre | Rango |
|---|---|
| **mobile** | menos de 768 px |
| **tablet** | de 768 px a 991 px |
| **desktop** | 992 px o más |

## 2. Instalación

1. Copia la carpeta `styles/foundations/` a tu proyecto.
2. Enlaza `breakpoints.css` **antes** que el resto de tu CSS y, si usas el grid, `grid.css`
   justo después. En AEM Edge Delivery Services va en `head.html` (y en `404.html` si tiene su
   propio `<head>`):

   ```html
   <link rel="stylesheet" href="/styles/foundations/breakpoints.css">
   <link rel="stylesheet" href="/styles/foundations/grid.css">
   <link rel="stylesheet" href="/styles/styles.css">
   ```

3. `sessions.css` y `toast.css` **no** van en `head.html`: los cargan
   `scripts/foundations/block-options.js` y `scripts/foundations/toast.js`. Solo cópialos junto
   con `scripts/foundations/`.
4. Listo: ya puedes usar los nombres en cualquier archivo CSS.

## 3. Cómo se usa

### Los 6 nombres

| Quiero que aplique en… | Escribo |
|---|---|
| solo **mobile** | `@container style(--mobile: on) { … }` |
| solo **tablet** | `@container style(--tablet: on) { … }` |
| solo **desktop** | `@container style(--desktop: on) { … }` |
| **mobile + tablet** | `@container style(--mobile-tablet: on) { … }` |
| **tablet + desktop** | `@container style(--tablet-desktop: on) { … }` |
| **mobile + desktop** (sin tablet) | `@container style(--mobile-desktop: on) { … }` |
| las 3 | sin nada (el estilo normal) |

> Siempre se escribe `: on`. `@container style(--tablet)` sin valor **no** funciona.

### Ejemplo dentro de un bloque (con nesting)

La resolución va **justo debajo** de la parte que cambia:

```css
.card-featured {
  & .card-featured-header {
    margin-block-end: 24px;            /* las 3 */

    @container style(--tablet-desktop: on) {
      margin-block-end: 32px;          /* tablet y desktop */
    }

    @container style(--desktop: on) {
      margin-block-end: 40px;          /* solo desktop */
    }
  }
}
```

### Ejemplo sin nesting

```css
.hero-title {
  font-size: 32px;
}

@container style(--desktop: on) {
  .hero-title {
    font-size: 48px;
  }
}
```

### Combinar a mano con `or` / `and`

Los 6 nombres ya cubren todas las combinaciones, pero también puedes juntarlos:

```css
@container style(--mobile: on) or style(--desktop: on) {
  /* igual que --mobile-desktop */
}
```

### Recomendación: mobile-first

Escribe primero el estilo de **mobile** (sin nada). Debajo pon `--tablet-desktop` y después
`--desktop`, así cada uno solo cambia lo necesario. Además, si un navegador viejo no entiende
los nombres, se queda con el estilo de mobile y la página sigue funcionando (ver sección 6).

## 4. Pasar de `@media` a los nombres

| Antes | Ahora |
|---|---|
| `@media (width < 768px)` | `@container style(--mobile: on)` |
| `@media (768px <= width < 992px)` | `@container style(--tablet: on)` |
| `@media (width >= 992px)` | `@container style(--desktop: on)` |
| `@media (width < 992px)` | `@container style(--mobile-tablet: on)` |
| `@media (width >= 768px)` | `@container style(--tablet-desktop: on)` |
| `@media (width < 768px), (width >= 992px)` | `@container style(--mobile-desktop: on)` |

Si un archivo usaba otros cortes (por ejemplo `600px` o `900px`), pásalo al nombre más
cercano y revisa cómo se ve en esos anchos: el cambio de diseño se mueve a 768 / 992.

`@media (prefers-reduced-motion)`, `@media print`, etc. **no** se cambian: no son de tamaño de pantalla.

### En JavaScript

CSS y JS no comparten estas variables. Si un script necesita saber la resolución, usa los
mismos números con `matchMedia` y deja un comentario que apunte a este archivo:

```js
// same breakpoint as styles/foundations/breakpoints.css (desktop ≥ 992px)
const isDesktop = window.matchMedia('(width >= 992px)');
```

## 5. Cambiar los cortes

Los números están **solo** en `breakpoints.css`, en las dos `@media`:

```css
@media (width >= 768px) { … }   /* tablet empieza aquí  */
@media (width >= 992px) { … }   /* desktop empieza aquí */
```

Cambia esos dos valores y todo el CSS que usa los nombres se ajusta solo. Recuerda actualizar
también los `matchMedia` de JS, si tienes alguno.

## 6. Compatibilidad

Usa *style queries* de contenedor (`@container style(...)`) con variables CSS:

| Navegador | Desde |
|---|---|
| Chrome / Edge | 111 |
| Safari (macOS e iOS) | 18 |
| Firefox | 151 |
| **Usuarios cubiertos** | **≈ 92 %** ([caniuse](https://caniuse.com/css-container-queries-style)) |

En navegadores más viejos, las reglas con nombre se ignoran y se ve el estilo base (mobile).
Por eso conviene escribir mobile-first.

## 7. Límites y preguntas frecuentes

- **¿Por qué `@container` y no `@media`?** `@media` no puede leer variables. `@media (--tablet)`
  (`@custom-media`) solo funciona con un paso de build (PostCSS). `@container style()` es la
  única forma en CSS puro de usar nombres con los números en un solo archivo.
- **No sirve para `<html>`**: el estilo se evalúa con el elemento padre, y `<html>` no tiene.
  Para `body` y todo lo de adentro funciona normal.
- **No cambia el layout por sí mismo**: no hace falta `container-type` ni ninguna clase extra.
  Todos los elementos ya leen los nombres.
- **Los nombres son variables globales** (`--mobile`, `--tablet`, …): no uses esos mismos nombres
  para otras variables de tu proyecto.

---

## 8. Grid (`grid.css`)

Solo CSS. Necesita `breakpoints.css` enlazado antes. Clases en minúsculas.

### Estructura (siempre)

Para usar columnas **siempre** van los tres niveles, en este orden:
**`container` (o `container-fluid`) → `row` → `col`**. También dentro de una columna: si adentro
quieres otra fila, lleva su propio `container-fluid`.

```html
<div class="container">              <!-- o container-fluid -->
  <div class="row">
    <div class="col">…</div>
  </div>
</div>
```

- `container`: cuando el elemento que lo contiene **no** tiene margen lateral propio.
- `container-fluid`: cuando ya lo tiene (por ejemplo, dentro de una sección de la página que ya
  tiene padding) o cuando quieres todo el ancho.

| Clase | Qué hace |
|---|---|
| `container` | Todo el ancho, con padding lateral (16 px mobile, 24 px tablet y desktop) |
| `container-fluid` | Todo el ancho, sin padding |
| `row` | Fila: acomoda las columnas y baja a otra línea las que no caben |
| `col` | Columna automática: las `col` de la fila se reparten el espacio en partes iguales |
| `col-auto` | Columna del ancho de su contenido (por ejemplo un botón junto a un título en `col`) |
| `col-1` … `col-24` | Columna de N de 24 partes (`col-12` mitad, `col-8` tercio, `col-6` cuarto) |
| `col-0` | Oculta la columna |

### Resoluciones

| Prefijo | Desde | Toma el nombre de `breakpoints.css` |
|---|---|---|
| `sm` | 0 (mobile) | — (es el estilo base; `col-6` = `col-sm-6`) |
| `md` | tablet | `--tablet-desktop` |
| `lg` | desktop | `--desktop` |

Cada tamaño aplica desde su resolución hacia arriba, hasta que otro lo cambie. Nombres:
`{row|col}-{sm|md|lg}-{propiedad}-{valor}`; sin resolución aplica a todas.

### Todas las clases

Cada clase existe sin prefijo (todas las resoluciones) y con `sm`, `md` o `lg` (desde esa
resolución): `col-6`, `col-md-12`, `row-lg-gutter-24`…

| Clase | Va en | Qué hace |
|---|---|---|
| `container` / `container-fluid` | El contenedor | Todo el ancho con padding lateral / sin padding |
| `row` | La fila | Acomoda las columnas y baja las que no caben |
| `row-nowrap` / `row-wrap` | La fila | No bajar / sí bajar las columnas que no caben |
| `row-start` / `row-center` / `row-end` | La fila | Columnas a la izquierda / al centro / a la derecha |
| `row-space-between` / `row-space-around` / `row-space-evenly` | La fila | Reparte el espacio sobrante entre las columnas |
| `row-top` / `row-middle` / `row-bottom` / `row-stretch` | La fila | Alineación vertical de las columnas |
| `row-gutter-{0,8,16,24,32,40,48}` | La fila | Espacio horizontal entre columnas (px) |
| `row-gutter-y-{0,8,16,24,32,40,48}` | La fila | Espacio vertical entre las líneas de columnas (px) |
| `col` | La columna | Se reparte el espacio en partes iguales con las demás `col` |
| `col-auto` | La columna | Del ancho de su contenido |
| `col-1` … `col-24` | La columna | N de 24 partes (`col-12` mitad, `col-8` tercio, `col-6` cuarto) |
| `col-0` | La columna | La oculta |
| `col-offset-0` … `col-offset-23` | La columna | Deja N partes vacías a su izquierda |
| `col-order-0` … `col-order-24` | La columna | Cambia su orden en la fila |

### Ejemplos

```html
<!-- automáticas: 3 partes iguales -->
<div class="row"><div class="col">A</div><div class="col">B</div><div class="col">C</div></div>

<!-- fijas (de 24); si pasan de 24, bajan -->
<div class="row"><div class="col-12">½</div><div class="col-6">¼</div><div class="col-6">¼</div></div>

<!-- fija + automática que llena el resto -->
<div class="row"><div class="col-6">fija</div><div class="col">resto</div></div>

<!-- mobile 24 · tablet 12 · desktop 8 -->
<div class="col-sm-24 col-md-12 col-lg-8">…</div>

<!-- mobile 2 · tablet y desktop 4 -->
<div class="col-sm-2 col-md-4">…</div>

<!-- automática en mobile y tablet · 6 en desktop -->
<div class="col col-lg-6">…</div>

<!-- título que llena la fila + botón del ancho de su texto -->
<div class="row row-middle row-gutter-16">
  <div class="col">Título</div>
  <div class="col-auto"><a href="…">Ver todos</a></div>
</div>

<!-- del ancho de su contenido solo desde tablet -->
<div class="col-24 col-md-auto">…</div>

<!-- se oculta desde tablet · solo aparece en desktop -->
<div class="col-md-0">…</div>
<div class="col-0 col-lg-8">…</div>

<!-- offset: columnas vacías a la izquierda (0 a 23) -->
<div class="col-8 col-offset-8">centrada</div>
<div class="col-12 col-md-offset-6 col-lg-offset-0">se mueve solo en tablet</div>

<!-- order (0 a 24): mobile A, B · desde tablet B, A -->
<div class="row">
  <div class="col-12 col-md-order-2">A</div>
  <div class="col-12 col-md-order-1">B</div>
</div>

<!-- gutter horizontal y vertical: 0, 8, 16, 24, 32, 40, 48 -->
<div class="row row-gutter-16">…</div>
<div class="row row-gutter-y-24">…</div>
<div class="row row-gutter-8 row-md-gutter-16 row-lg-gutter-32">…</div>

<!-- alineación horizontal -->
<div class="row row-start">…</div>          <!-- también row-center, row-end -->
<div class="row row-space-between">…</div>  <!-- también row-space-around, row-space-evenly -->
<div class="row row-start row-md-center">…</div>

<!-- alineación vertical (por defecto todas igual de altas) -->
<div class="row row-middle">…</div>         <!-- también row-top, row-bottom, row-stretch -->

<!-- una sola línea: las que no caben se salen de la fila -->
<div class="row row-nowrap">…</div>
<div class="row row-nowrap row-md-wrap">…</div>

<!-- fila dentro de una columna: con su propio container-fluid y su propio gutter (empieza en 0) -->
<div class="container">
  <div class="row row-gutter-24">
    <div class="col-12">
      <div class="container-fluid">
        <div class="row row-gutter-8"><div class="col-12">…</div><div class="col-12">…</div></div>
      </div>
    </div>
  </div>
</div>
```

### Cómo funciona el gutter

Cada columna lleva la mitad del espacio a cada lado y la `row` lo compensa con margen negativo,
así la primera y la última columna quedan alineadas con el borde del `container`. El vertical es
`row-gap`. Sin clase de gutter las columnas van pegadas.

> Por eso la `row` siempre va dentro de `container` o `container-fluid`: con gutter, la fila
> sobresale la mitad del gutter por cada lado y el container es lo que la contiene.

### Cambiar el padding del container

Está **solo** al inicio de `grid.css`:

```css
:root {
  --grid-container-padding: 16px;     /* mobile */
  --grid-container-padding-md: 24px;  /* tablet y desktop */
}
```

### Compatibilidad

Igual que `breakpoints.css` (sección 6): en navegadores sin *style queries* se ven las clases sin
prefijo y las `sm` en todas las resoluciones (diseño mobile). Escribe primero la versión mobile.

---

## 9. Sesiones (`sessions.css`)

Clases para **mostrar u ocultar cualquier elemento según quién visita**. Solo visibilidad: no tiene
colores, tamaños ni variables, así que se lleva tal cual a otro proyecto.

### Quién lo carga

No va como `<link>` en `head.html`. Lo agrega `scripts/foundations/session.js` al arrancar
(`initPageSession`), que `head.html` carga en todas las páginas antes de `scripts.js`, así que ya
está pedido antes de que se pinte cualquier bloque. Va siempre con `session.js`.

### El estado: una clase en `<html>`

`session.js` pone **una** clase en `<html>` antes de pintar y la cambia al iniciar sesión, entrar
como invitado o cerrar sesión:

| Clase en `<html>` | Cuándo |
|---|---|
| `session-state-signed-in` | Hay sesión |
| `session-state-guest` | "Continuar como invitado" |
| `session-state-signed-out` | Ninguna de las dos (o la sesión venció) |
| `session-state-editor` | Panel de edición: **se ve todo**, para poder editar |

### Las clases para los elementos

Un elemento lleva `session-only` y **quién lo ve**. Se combinan para decir "o":

| Clases | Se ve con |
|---|---|
| `session-only session-only-signed-in` | Sesión |
| `session-only session-only-signed-out` | Sin sesión |
| `session-only session-only-guest` | Invitado |
| `session-only session-only-signed-in session-only-guest` | Sesión **o** invitado |
| `session-only session-only-signed-out session-only-guest` | Sin sesión **o** invitado |
| sin `session-only` | Todos (no depende de la sesión) |

```html
<div class="session-only session-only-signed-in">Tienes 2 cupones disponibles</div>
<a class="session-only session-only-signed-out" href="/login">Iniciar sesión</a>
```

### Cómo funciona

```css
/* mientras no hay estado, lo que depende de la sesión queda oculto (sin parpadeo) */
:root:not([class*='session-state-']) .session-only { display: none !important; }

/* con estado: se oculta lo que NO es para ese estado */
.session-state-signed-in .session-only:not(.session-only-signed-in),
.session-state-guest .session-only:not(.session-only-guest),
.session-state-signed-out .session-only:not(.session-only-signed-out) { display: none !important; }
```

- **Solo oculta** (`display: none`) lo que no toca. Lo que sí toca conserva su propio `display`
  (`flex`, `grid`…): no lo pisa.
- **Cambia al instante**, sin recargar: basta con que cambie la clase de `<html>`.
- **Sin parpadeo:** mientras el estado no se conoce, todo lo marcado con `session-only` está oculto.
- En el panel de edición (`session-state-editor`) ninguna regla aplica: se ve todo.

### Quién pone las clases

Normalmente nadie las escribe a mano:

| Desde | Cómo |
|---|---|
| Drive, un bloque completo | Fila `Session` del bloque: `true` → `session-only-signed-in`; `false` → `session-only-signed-out session-only-guest` (lo hace `block-options.js` en el bloque y su `-wrapper`) |
| JavaScript de un bloque | `showOnlyForSessionStates(element, 'signed-in, guest')` de `scripts/foundations/session.js` |
| HTML o CSS propio | Escribir las clases directamente |

> Las **filas** por sesión (estado en la última columna de una tabla) no usan estas clases: esas
> filas se quitan antes de que el bloque lea su tabla (`filterRowsBySessionState`).

### Seguridad

Ocultar no es proteger: lo oculto sigue en el HTML. Los datos privados deben llegar del servicio con
el token, nunca escritos en la página. Guía completa: `documentation/08-sesiones.md`.

---

## 10. Alerta (`toast.css`)

Estilos de la alerta flotante de `scripts/foundations/toast.js` (`showToast`): arriba a la
derecha, debajo del header, apilable y con botón de cerrar.

### Quién lo carga

`toast.js` lo pide con `loadCSS` la primera vez que se muestra una alerta: no va en `head.html`.

### Clases

Todas las reglas viven dentro de `.toast-novamovil`:

| Clase | Qué es |
|---|---|
| `toast-novamovil` | La alerta (un `popover`) |
| `toast-novamovil-error` / `-warning` / `-success` / `-info` | Variante de color |
| `toast-novamovil-message` | El texto |
| `toast-novamovil-close` | El botón de cerrar |

### Variables que necesita

| Variable | Dónde está | Para qué |
|---|---|---|
| `--toast-text`, `--toast-error-background`, `--toast-warning-background`, `--toast-success-background`, `--toast-info-background`, `--toast-close-hover`, `--toast-shadow` | `styles/colors.css` | Colores (error, aviso y éxito están oscurecidos para que el texto blanco pase 4.5:1) |
| `--z-index-toast` (`900`) | `styles/styles.css` | Queda debajo del header (`1000`) |
| `--nav-height` | `styles/styles.css` | Para quedar justo debajo del header |
| `--toast-background` | La pone cada variante (o `showToast` con un color hex) | Fondo de la alerta |
| `--toast-offset` | La pone `toast.js` | Apilar varias alertas una debajo de otra |

### Llevarlo a otro proyecto

Copia `toast.css` con `scripts/foundations/toast.js` y define en tu proyecto las variables de la
tabla (colores, `--z-index-toast` y `--nav-height`).
