# Foundations · Breakpoints

Bases de CSS **portables**: copias la carpeta `foundations/` a cualquier proyecto y funcionan
igual. Por ahora contiene:

| Archivo | Qué hace |
|---|---|
| `breakpoints.css` | Las 3 resoluciones del sitio (**mobile, tablet, desktop**) con nombre, para usarlas en cualquier CSS sin repetir números |

Solo CSS: no necesita JavaScript, Sass, PostCSS ni paso de build.

---

## 1. Las 3 resoluciones

Cortes `md` y `lg` de [Ant Design](https://ant.design/components/grid):

| Nombre | Rango |
|---|---|
| **mobile** | menos de 768 px |
| **tablet** | de 768 px a 991 px |
| **desktop** | 992 px o más |

## 2. Instalación

1. Copia la carpeta `styles/foundations/` a tu proyecto.
2. Enlaza `breakpoints.css` **antes** que el resto de tu CSS:

   ```html
   <link rel="stylesheet" href="/styles/foundations/breakpoints.css">
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
