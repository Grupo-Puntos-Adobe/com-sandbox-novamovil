# Foundations · Breakpoints y Grid

Bases de CSS **portables**: copias la carpeta `foundations/` a cualquier proyecto y funcionan
igual. Contiene:

| Archivo | Qué hace |
|---|---|
| `breakpoints.css` | Las 3 resoluciones del sitio (**mobile, tablet, desktop**) con nombre, para usarlas en cualquier CSS sin repetir números |
| `grid.css` | Sistema de grid: `container`, `row` y columnas de 24 partes por resolución (`sm`, `md`, `lg`). Usa los nombres de `breakpoints.css` (ver sección 8) |

Solo CSS: no necesita JavaScript, Sass, PostCSS ni paso de build.

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
   justo después:

   ```html
   <link rel="stylesheet" href="/styles/foundations/breakpoints.css">
   <link rel="stylesheet" href="/styles/foundations/grid.css">
   <link rel="stylesheet" href="/styles/styles.css">
   ```

   En AEM Edge Delivery Services va en `head.html` (y en `404.html` si tiene su propio `<head>`).
3. Listo: ya puedes usar los nombres en cualquier archivo CSS.

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

### Estructura

```html
<div class="container">
  <div class="row">
    <div class="col">…</div>
  </div>
</div>
```

| Clase | Qué hace |
|---|---|
| `container` | Todo el ancho, con padding lateral (16 px mobile, 24 px tablet y desktop) |
| `container-fluid` | Todo el ancho, sin padding |
| `row` | Fila: acomoda las columnas y baja a otra línea las que no caben |
| `col` | Columna automática: las `col` de la fila se reparten el espacio en partes iguales |
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

<!-- fila dentro de una columna: tiene su propio gutter (empieza en 0) -->
<div class="row row-gutter-24">
  <div class="col-12">
    <div class="row row-gutter-8"><div class="col-12">…</div><div class="col-12">…</div></div>
  </div>
</div>
```

### Cómo funciona el gutter

Cada columna lleva la mitad del espacio a cada lado y la `row` lo compensa con margen negativo,
así la primera y la última columna quedan alineadas con el borde del `container`. El vertical es
`row-gap`. Sin clase de gutter las columnas van pegadas.

> Con gutter, una `row` fuera de un `container` sobresale la mitad del gutter por cada lado.
> Ponla dentro de `container` (o dale padding al elemento que la contiene).

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

