# 03 · Hero Novamovil: cómo se escribe en Drive

El hero se escribe como una tabla con **una fila por elemento**. Todas las filas son
opcionales y pueden ir en cualquier orden: en la página siempre se muestran en el orden
del diseño (tag, título, descripción, botones, estadísticas e imagen).

## La tabla

| Hero Novamovil | | |
|---|---|---|
| Styles | *(opcional, ver 01-styles-classname.md)* | |
| Classname | *(opcional)* | |
| Tag | Lanzamiento exclusivo 2026 | |
| Title | El futuro de la *conectividad* está aquí | |
| Description | Los mejores smartphones del mercado con planes ilimitados… | |
| Button 1 | [Ver celulares](/celulares) | |
| Button 2 | [Ver planes](/planes) | |
| Stat 1 | 4.9M+ | Usuarios activos |
| Stat 2 | 99.8% | Cobertura 5G |
| Stat 3 | 24/7 | Soporte |
| Image | *(imagen)* | |

## Reglas

| Fila | Qué poner | Cómo se ve |
|---|---|---|
| `Tag` | Texto corto | Píldora con punto cian arriba del título |
| `Title` | Texto normal; la palabra en *cursiva* se destaca | Título grande; la cursiva sale con el degradado de marca |
| `Description` | Uno o varios párrafos | Texto gris debajo del título |
| `Button 1`, `Button 2`, `Button 3`… | Un enlace (texto + URL) | `Button 1` es el principal (degradado); los demás, secundarios (translúcidos). Se ordenan por número |
| `Stat 1`, `Stat 2`… | Valor en la 2.ª celda y texto en la 3.ª | Número grande y texto pequeño debajo. Se ordenan por número |
| `Image` | Una imagen | Tarjeta redondeada a la derecha, solo en desktop |

- No hace falta usar estilos de título de Docs (Título 1, 2…) ni negritas o cursivas en los botones.
- Si una fila no existe o está vacía, ese elemento no aparece. Sin `Image`, el bloque recibe la clase `no-media`.
- La tabla tiene 3 columnas por las estadísticas; en las demás filas el valor ocupa las 2 últimas
  columnas (celdas combinadas). La tabla mide el ancho de la página (6.5"), así que no se sale.

## HTML que genera (todo con `div`)

- Título: `div.hero-title` con `role="heading" aria-level="1"`, para que lectores de pantalla
  y buscadores lo reconozcan como el título principal de la página.
- Estadísticas: `div.hero-stats` (`role="list"`) con `div.hero-stat` (`role="listitem"`).
- Botones: `a.hero-button` (`-primary` / `-secondary`); son enlaces, por eso `<a>`.
- Imagen: `picture.hero-picture > img.hero-image`, que AEM genera optimizada.

Código: `blocks/hero-novamovil/hero-novamovil.js` (lectura de filas) y
`blocks/hero-novamovil/hero-novamovil.css` (estilos, solo clases).
