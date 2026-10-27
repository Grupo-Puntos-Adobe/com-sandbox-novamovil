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

<div class="breadcrumb"></div>

## Componente Breadcrumb

Este componente permite a los usuarios **ver en qué parte del sitio están y volver a los niveles
anteriores** ("Inicio › Celulares").
Solo sale en las páginas que agregan la tabla **Breadcrumb** en Drive. Cada nivel es una fila; el
último es la página actual.

### Características

- Niveles numerados (`Level 1`, `Level 2`…) en cualquier orden: se muestran por número
- Los niveles con enlace llevan a su página; el último es la página actual, sin enlace
- Separador `›` entre niveles (lo pinta el CSS)
- Niveles dinámicos con marcas del store (`scripts/foundations/store.js`): `{breadcrumb.name}` se
  cambia por el nombre que pone otro bloque al cargar (por ejemplo product-detail con el nombre del
  celular). Se puede combinar con texto (`Detalle de {breadcrumb.name}`) y **varios niveles pueden
  ser dinámicos**, cada uno con su marca; un nivel no se pinta hasta que llegan sus valores. **Sin
  marca se ve el texto que escribió el autor**
- Si una fila de nivel está vacía no se pinta; sin niveles, el bloque no pinta nada
- Solo acepta enlaces del mismo sitio o `http(s)`
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- **Por sesión** (como todo bloque NovaMóvil): la fila `Session` (`true` / `false`) muestra u oculta
  la ruta completa, y un nivel puede llevar el estado en la **última columna** (`Level 2 | Mi cuenta
  | signed-in`) para cambiar según quién visita
- Accesible: navegación con nombre ("Ruta de navegación"), lista de niveles y la página actual con
  `aria-current="page"`

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`breadcrumb-*`). Todo se
construye con `div` y roles ARIA, excepto los enlaces (`a`).

- `breadcrumb` – Contenedor principal del componente (el bloque)
- `breadcrumb-trail` – Navegación (`role="navigation"`, `aria-label="Ruta de navegación"`)
- `breadcrumb-list` – Lista de niveles (`role="list"`)
- `breadcrumb-item` – Cada nivel (`role="listitem"`); el `›` va después de cada uno menos el último
- `breadcrumb-link` – Enlace de un nivel anterior (`a`)
- `breadcrumb-text` – Nivel anterior sin enlace
- `breadcrumb-current` – Página actual (`aria-current="page"`)

```text
div.breadcrumb
└─ div.breadcrumb-trail[role=navigation][aria-label]
   └─ div.breadcrumb-list[role=list]
      ├─ div.breadcrumb-item[role=listitem]   × cada nivel anterior
      │  └─ a.breadcrumb-link
      └─ div.breadcrumb-item[role=listitem]   (último nivel)
         └─ div.breadcrumb-current[aria-current=page]
```

### Resoluciones

| Resolución | Cómo se ve |
|---|---|
| mobile, tablet y desktop | Una línea de 13 px que pasa a la siguiente si los niveles no caben |

### Estructura de la tabla en Drive

El autor escribe una tabla **Breadcrumb** en el documento de Drive, con **una fila por nivel**. Todas
las filas son opcionales y pueden ir en cualquier orden.

1. **`Styles`**
    - **Tipo:** Texto (declaraciones CSS separadas por `;`)
    - **Descripción:** Estilos en línea sobre el bloque
    - **Por defecto:** ninguno (ver `documentation/06-styles-classname.md`)

2. **`Classname`**
    - **Tipo:** Texto (nombres separados por espacio o coma)
    - **Descripción:** Clases extra sobre el bloque
    - **Por defecto:** ninguna

3. **`Session`**
    - **Tipo:** `true` / `false`
    - **Descripción:** `true` = la ruta solo se ve con sesión; `false` = solo sin sesión (el
      invitado cuenta como "sin sesión")
    - **Por defecto:** vacía o sin la fila, se ve siempre (ver `documentation/06-styles-classname.md`)

4. **`Level 1`, `Level 2`, `Level 3`…**
    - **Tipo:** Enlace (texto y link en la celda) o texto
    - **Descripción:** Cada nivel de la ruta, ordenado por número. El último es la página actual y,
      aunque tenga enlace, se muestra como texto
    - **Por defecto:** ninguno. Un nivel vacío no se pinta
    - **Nivel dinámico:** una marca del apartado `breadcrumb` del store (`{breadcrumb.name}`) se
      cambia por el valor que pone otro bloque con `store.set('breadcrumb.name', …)`
      (`store.fill` de `scripts/foundations/store.js`). Puede ir sola o con texto
      (`Detalle de {breadcrumb.name}`); sin marca, el nivel muestra su texto tal cual. Para otro
      nivel dinámico se agrega un valor al apartado (por ejemplo `{breadcrumb.brand}`)
    - **Nivel por sesión (opcional):** una tercera columna con `signed-in`, `signed-out` o `guest`
      (combinables con coma). Ese nivel solo existe para ese estado; sin la columna lo ven todos.
      Varios niveles con el mismo número y distinto estado se alternan:

      | Breadcrumb | | |
      |---|---|---|
      | Level 1 | [Inicio](/) | |
      | Level 2 | Visitante | signed-out |
      | Level 2 | Invitado | guest |
      | Level 2 | Mi cuenta | signed-in |

      Ver `documentation/08-sesiones.md`.

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- Los **niveles** de la ruta (texto y enlace) y, si se quiere, **para quién** es cada uno
- **Estilos**, **clases** extra y **sesión** del bloque

![Vista Tabla en Drive](/documentation/readme/breadcrumb/drive-table.png)

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Niveles en desorden (`Level 2` antes que `Level 1`) | Se ordenan por número |
| Un nivel sin enlace que no es el último | Texto gris, sin enlace |
| El último nivel con enlace | Texto oscuro en negrita, sin enlace (es la página actual) |
| Una fila de nivel vacía | No se pinta |
| Sin filas de nivel | El bloque queda vacío |
| Nivel `{breadcrumb.name}` | No se pinta hasta que otro bloque pone el nombre; luego sale como página actual ("Inicio › Celulares › Apple iPhone 15 Pro") |
| Nivel `Detalle de {breadcrumb.name}` | "Detalle de Apple iPhone 15 Pro" cuando llega el nombre |
| Dos niveles dinámicos (`{breadcrumb.brand}` y `{breadcrumb.name}`) | Cada uno aparece cuando llega su valor: "Inicio › Celulares › Apple › iPhone 15 Pro" |
| Nivel sin marca (`Mi cuenta`) | El texto tal cual |
| Niveles con estado en la última columna | Solo se pintan los del estado de quien visita ("Inicio › Visitante" sin sesión, "Inicio › Mi cuenta" con sesión); al cambiar la sesión la página se recarga |
| Fila `Session` = `true` / `false` | La ruta completa se oculta sin sesión / con sesión, al instante |

### Cómo probarlo

1. Una página con `Level 1 | Inicio` y `Level 2 | Celulares`: se ve "Inicio › Celulares".
2. En el detalle (`Level 3 | {breadcrumb.name}`): al cargar el celular sale "Inicio › Celulares › Apple
   iPhone 15 Pro".
3. Con `Level 2 | Visitante | signed-out` y `Level 2 | Mi cuenta | signed-in`: sin sesión
   "Inicio › Visitante"; al iniciar sesión (la página se recarga) "Inicio › Mi cuenta".
4. Con `Session | true`: la ruta no se ve sin sesión y aparece al iniciar sesión.

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/breadcrumb/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/breadcrumb/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/breadcrumb/component-mobile.png)

### Archivos y dependencias

- `breadcrumb.js` – Lee los niveles de la tabla y construye la ruta
- `breadcrumb.css` – Estilos de la ruta (tamaños, colores y separador)
- `scripts/foundations/block-options.js` – Filas `Styles`, `Classname` y `Session`, y niveles por
  sesión (última columna)
- `scripts/foundations/block-utils.js` – `getSafeHref` para validar los enlaces
- `scripts/foundations/store.js` – Apartado `breadcrumb` del store: `store.fill`, `store.has` y
  `store.subscribe` para las marcas como `{breadcrumb.name}`
- Colores en `styles/colors.css` (`--breadcrumb-*`)
- Se usa en: la página Celulares (junto con `blocks/product-catalog/`) y la de detalle (junto con
  `blocks/product-detail/`)
- Guías: `documentation/08-sesiones.md` (sesiones) y `documentation/06-styles-classname.md`
  (`block-options`)
