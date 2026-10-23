<!--
Copyright [2025] Adobe

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<div class="hero-novamovil"></div>

## Componente Hero Novamovil

Este componente permite a los usuarios **ver el banner principal de la página con etiqueta, título
con palabra destacada, descripción, botones, estadísticas e imagen**.
Todo el contenido sale de la tabla de Drive (no llama a ningún servicio). Es la primera sección de la
página: ocupa todo el ancho, en móvil y tablet va en una columna sin imagen y en desktop lleva el texto
a la izquierda y la imagen a la derecha.

### Características

- Etiqueta (píldora con punto cian) arriba del título
- Título con una palabra destacada en el degradado de marca (la palabra en *cursiva* en Drive)
- Descripción de uno o varios párrafos
- Botones numerados: `Button 1` es el principal (degradado) y los demás son secundarios (translúcidos)
- Estadísticas numeradas (valor grande + texto pequeño)
- Imagen en tarjeta redondeada con sombra, solo en desktop; se carga primero porque es lo más grande
  de la página (`loading="eager"`, `fetchpriority="high"`)
- Filas en cualquier orden: en la página siempre salen en el orden del diseño
- Fila que no existe o está vacía → ese elemento no aparece (sin `Image`, el bloque lleva `no-media`)
- Círculos decorativos de fondo
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- **Por sesión** (como todo bloque NovaMóvil): fila `Session` (`true` / `false`) para el bloque
  completo y el estado en la última columna de cualquier fila
- Adaptación a móvil, tablet y desktop (`styles/foundations/breakpoints.css`)
- Accesible: título principal de la página con `role="heading"` y `aria-level="1"`, estadísticas como
  lista y foco visible en los botones

### Estructura / Descripción de clases

El componente usa clases `hero-*` dentro del bloque `.hero-novamovil`. Todo se construye con `div` y
roles ARIA, excepto los botones (`a`, porque son enlaces) y la imagen (`picture` / `img`, que AEM
genera optimizada).

- `hero-novamovil` – Contenedor principal del componente (el bloque, fondo y círculos decorativos)
- `no-media` – Se agrega al bloque cuando no hay fila `Image`
- `hero-inner` – Contenedor de las dos columnas (texto + imagen)
- `hero-content` – Columna del texto
- `hero-tag` – Etiqueta (píldora)
- `hero-title` – Título principal (`role="heading"`, `aria-level="1"`)
- `hero-highlight` – Palabra destacada del título (la cursiva de Drive)
- `hero-description` – Descripción
- `hero-actions` – Contenedor de los botones
- `hero-button` – Botón (`a`)
- `hero-button-primary` – Botón principal (`Button 1`, degradado)
- `hero-button-secondary` – Botones secundarios (`Button 2`, `3`…, translúcidos)
- `hero-stats` – Lista de estadísticas (`role="list"`)
- `hero-stat` – Cada estadística (`role="listitem"`)
- `hero-stat-value` – Valor ("4.9M+")
- `hero-stat-label` – Texto ("Usuarios activos")
- `hero-media` – Tarjeta de la imagen (solo desktop)
- `hero-picture` – `picture` de la imagen
- `hero-image` – `img` de la imagen

```text
div.hero-novamovil
└─ div.hero-inner
   ├─ div.hero-content
   │  ├─ div.hero-tag
   │  ├─ div.hero-title[role=heading][aria-level=1]
   │  │  └─ span.hero-highlight
   │  ├─ div.hero-description
   │  ├─ div.hero-actions
   │  │  ├─ a.hero-button.hero-button-primary          (Button 1)
   │  │  └─ a.hero-button.hero-button-secondary        × Button 2, 3…
   │  └─ div.hero-stats[role=list]
   │     └─ div.hero-stat[role=listitem]               × Stat 1, 2…
   │        ├─ div.hero-stat-value
   │        └─ div.hero-stat-label
   └─ div.hero-media
      └─ picture.hero-picture
         └─ img.hero-image
```

### Resoluciones

| Resolución | Columnas | Imagen | Título | Botones |
|---|---|---|---|---|
| mobile (< 768 px) | 1 (solo texto) | oculta | 32 px | 46 px de alto |
| tablet (768–991 px) | 1 (solo texto) | oculta | 32 px | 46 px de alto |
| desktop (≥ 992 px) | 2 (texto + imagen) | tarjeta cuadrada de hasta 380 px | 56 px | 52 px de alto |

### Estructura de la tabla en Drive

El autor escribe una tabla **Hero Novamovil** en el documento de Drive, con **una fila por
elemento**. Todas las filas son opcionales y pueden ir en cualquier orden. La tabla tiene 3 columnas
por las estadísticas; en las demás filas el valor ocupa las 2 últimas columnas (celdas combinadas).

1. **`Styles`**
    - **Tipo:** Texto (declaraciones CSS separadas por `;`)
    - **Descripción:** Estilos en línea sobre el bloque, por ejemplo `margin-top: 20px; padding-left: 16px`
    - **Por defecto:** ninguno (ver `documentation/06-styles-classname.md`)

2. **`Classname`**
    - **Tipo:** Texto (nombres separados por espacio o coma)
    - **Descripción:** Clases extra sobre el bloque
    - **Por defecto:** ninguna

> **Sesión** (opcional, como todo bloque NovaMóvil, lo hace `block-options.js`): la fila
> **`Session`** muestra u oculta el bloque completo (`true` = solo con sesión, `false` = solo sin
> sesión, vacía o sin la fila = siempre) y **cualquier fila** puede llevar el estado en su **última
> columna** (`signed-in`, `signed-out`, `guest`, combinables con coma) para existir solo para ese
> estado. Ver `documentation/08-sesiones.md`.
>
> En esta tabla de 3 columnas, el estado va siempre en la **última**: en una fila con el valor en
> celdas combinadas, se separan y el estado va en la 3.ª (`| Title | Hola, *cliente* | signed-in |`);
> una `Stat N` con estado necesita una 4.ª columna (`| Stat 1 | 4.9M+ | Usuarios | signed-in |`).
>
> Ejemplo: otro título y otro botón principal para quien inició sesión:
>
> | Hero Novamovil | | |
> |---|---|---|
> | Title | El futuro de la *conectividad* está aquí | signed-out |
> | Title | Hola de nuevo, tu próximo *celular* te espera | signed-in |
> | Button 1 | [Ver celulares](/celulares) | |
> | Button 2 | [Iniciar sesión](/login) | signed-out |
> | Button 2 | [Mi cuenta](/cuenta) | signed-in |

3. **`Tag`**
    - **Tipo:** Texto corto
    - **Descripción:** Etiqueta (píldora con punto cian) arriba del título
    - **Por defecto:** ninguno. Si no viene o está vacía, no se pinta

4. **`Title`**
    - **Tipo:** Texto; la palabra en *cursiva* se destaca
    - **Descripción:** Título principal de la página; la cursiva sale con el degradado de marca. No hace
      falta usar estilos de título de Docs (Título 1, 2…)
    - **Por defecto:** ninguno. Si no viene o está vacío, no se pinta

5. **`Description`**
    - **Tipo:** Texto (uno o varios párrafos)
    - **Descripción:** Texto gris debajo del título
    - **Por defecto:** ninguno. Si no viene o está vacía, no se pinta

6. **`Button 1`, `Button 2`, `Button 3`…**
    - **Tipo:** Enlace (texto y link en la celda)
    - **Descripción:** `Button 1` es el principal (degradado); los demás, secundarios (translúcidos). Se
      ordenan por número. No hace falta poner negritas ni cursivas
    - **Por defecto:** ninguno. Sin enlace en la celda, ese botón no se pinta

7. **`Stat 1`, `Stat 2`…**
    - **Tipo:** Texto en dos celdas: valor (2.ª columna) y texto (3.ª columna)
    - **Descripción:** Número grande y texto pequeño debajo. Se ordenan por número
    - **Por defecto:** ninguno. Sin valor, esa estadística no se pinta; sin texto, solo sale el valor

8. **`Image`**
    - **Tipo:** Imagen
    - **Descripción:** Tarjeta redondeada a la derecha, solo en desktop
    - **Por defecto:** ninguna. Sin imagen, el bloque lleva la clase `no-media`

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- La **etiqueta**, el **título** (con su palabra destacada) y la **descripción**
- Los **botones** (texto y enlace) y cuál es el principal
- Las **estadísticas** (valor y texto)
- La **imagen**
- **Estilos** y **clases** extra del bloque

![Vista Tabla en Drive](/documentation/readme/hero-novamovil/drive-table.png)

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Fila `Session` = `true` / `false` | El bloque completo solo se ve con sesión / sin sesión; cambia al instante |
| Una fila con `signed-in`, `signed-out` o `guest` en la última columna | Esa fila solo existe para ese estado; al cambiar la sesión la página se recarga |
| Las filas están en otro orden | Se muestran en el orden del diseño: etiqueta, título, descripción, botones, estadísticas e imagen |
| Una fila no existe o está vacía | Ese elemento no aparece |
| Palabra en *cursiva* en `Title` | Sale con el degradado de marca |
| Varios párrafos en `Description` | Un renglón por párrafo |
| `Button 3`, `Button 1`, `Button 2` en desorden | Se ordenan por número; el `1` es el principal |
| Sin fila `Image` | El bloque lleva `no-media` y solo se ve el texto |
| Móvil o tablet | Una columna, sin imagen |

### Cómo probarlo

1. Home sin sesión: etiqueta, título, descripción, botones, estadísticas e imagen (desktop).
2. Quitar la fila `Image`: el bloque lleva `no-media` y solo se ve el texto.
3. Con las filas del ejemplo de sesión: sin sesión se ve el primer título y "Iniciar sesión"; al
   iniciar sesión (la página se recarga) el segundo título y "Mi cuenta".
4. Con `Session | false`: el hero completo se oculta al iniciar sesión.

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/hero-novamovil/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/hero-novamovil/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/hero-novamovil/component-mobile.png)

### Archivos y dependencias

- `hero-novamovil.js` – Lee las filas de la tabla y construye el bloque
- `hero-novamovil.css` – Estilos del bloque (tamaños, colores, degradado y resoluciones)
- `scripts/foundations/block-options.js` – Filas `Styles`, `Classname` y `Session`, estado por
  fila (última columna) y arranque de la regla de sesión de la página (el hero es el primer bloque
  del home, así que la regla corre antes de pintar)
- Guías: `documentation/06-styles-classname.md` (`block-options`) y `documentation/08-sesiones.md`
  (sesiones)
- `styles/foundations/breakpoints.css` – Resoluciones (mobile, tablet y desktop)
- Colores en `styles/colors.css` (`--hero-novamovil-*` y `--gradient-brand`)
