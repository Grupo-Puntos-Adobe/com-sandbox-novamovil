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

<div class="header header-novamovil"></div>

## Componente Header

Este componente permite a los usuarios **navegar el sitio desde la barra superior: marca, menú de
secciones, buscador, cuenta y carrito**.
Sale en todas las páginas, fijo arriba. Su contenido viene del documento **nav** de Drive (o del que
indique la metadata `nav` de la página). En móvil y tablet el menú se abre con el botón de
hamburguesa; en desktop el menú va en la misma barra.

### Características

- Marca (logo + nombre) como un solo enlace al inicio; la parte en *cursiva* del nombre sale en el
  color de acento (si no hay cursiva, se destaca "Móvil")
- Logo: la imagen del documento, el icono `:logo:` o, si no hay ninguno, el logo por defecto
- Menú de secciones desde la lista del documento; en móvil y tablet se abre con la hamburguesa
- Buscador que se despliega al pulsar la lupa y busca en `/search?q=…`
- Enlaces de **Mi cuenta** y **Carrito** (con contador) con iconos
- `Escape` cierra primero el buscador y luego el menú (el foco vuelve a la hamburguesa)
- Al seguir un enlace del menú, el menú móvil se cierra
- Mientras el menú móvil está abierto, la página no se desplaza por detrás
- Barra fija arriba de todo (64 px de alto, `--nav-height`), sin que la página salte debajo
- Adaptación a móvil, tablet y desktop (`styles/foundations/breakpoints.css`); el JS no decide nada
  por resolución, solo cambia `aria-expanded`
- Accesible: `nav`, buscador con `role="search"`, botones y enlaces de iconos con nombre para
  lectores de pantalla, `aria-expanded` en la hamburguesa y en la lupa, foco visible

### Estructura / Descripción de clases

Todos los estilos van dentro de `.header-novamovil` y solo usan clases.

- `header-novamovil` – Contenedor principal del componente (el bloque, fijo arriba)
- `nav-wrapper` – Fondo y sombra de la barra (crece con el menú móvil abierto)
- `nav-bar` – Barra (`nav#nav`); `is-open` con el menú móvil abierto
- `nav-brand` – Sección de la marca
- `nav-brand-link` – Enlace de la marca al inicio (`a`)
- `nav-brand-logo` – Logo (icono o `picture`)
- `nav-brand-image` – `img` del logo, si el autor puso una imagen
- `nav-brand-name` – Nombre de la marca
- `nav-brand-accent` – Parte destacada del nombre ("Móvil")
- `nav-sections` – Sección del menú
- `nav-menu` – Lista del menú
- `nav-menu-item` – Cada opción del menú (`has-link` si tiene enlace)
- `nav-menu-link` – Enlace de cada opción (`a`)
- `nav-tools` – Sección de herramientas (buscador, cuenta, carrito, hamburguesa)
- `nav-search` – Buscador (`is-open` cuando está desplegado)
- `nav-search-field` – Formulario del buscador (`role="search"`)
- `nav-search-input` – Campo de búsqueda
- `nav-search-clear` – Botón para cerrar la búsqueda
- `nav-search-toggle` – Botón de la lupa
- `nav-tool` – Enlace de icono (`nav-tool-user` para la cuenta, `nav-tool-cart` para el carrito)
- `nav-tool-badge` – Contador del carrito
- `nav-icon` – Icono (lupa, usuario, carrito, cerrar)
- `nav-hamburger` – Contenedor de la hamburguesa (solo móvil y tablet)
- `nav-hamburger-button` – Botón de la hamburguesa
- `nav-hamburger-icon` – Las tres rayas
- `has-header-menu-open` – Se pone en `body` mientras el menú móvil está abierto

```text
header
└─ div.header.header-novamovil
   └─ div.nav-wrapper
      └─ nav#nav.nav-bar[aria-expanded]
         ├─ div.nav-brand
         │  └─ a.nav-brand-link
         │     ├─ span.nav-brand-logo
         │     └─ span.nav-brand-name
         │        └─ em.nav-brand-accent
         ├─ div.nav-sections
         │  └─ ul.nav-menu
         │     └─ li.nav-menu-item.has-link   × cada sección
         │        └─ a.nav-menu-link
         └─ div.nav-tools
            ├─ div.nav-search
            │  ├─ form.nav-search-field[role=search]
            │  │  ├─ input.nav-search-input
            │  │  └─ button.nav-search-clear
            │  └─ button.nav-search-toggle
            ├─ a.nav-tool.nav-tool-user
            ├─ a.nav-tool.nav-tool-cart
            │  └─ span.nav-tool-badge
            └─ div.nav-hamburger
               └─ button.nav-hamburger-button
                  └─ span.nav-hamburger-icon
```

### Resoluciones

| Resolución | Menú | Hamburguesa | Nombre de la marca | Botones de iconos |
|---|---|---|---|---|
| mobile (< 768 px) | debajo de la barra, al abrir la hamburguesa | sí | 16 px | 36 px |
| tablet (768–991 px) | debajo de la barra, al abrir la hamburguesa | sí | 18 px | 40 px |
| desktop (≥ 992 px) | en la barra, entre la marca y las herramientas | no | 20 px | 40 px |

### Estructura del documento en Drive

El autor escribe un documento **nav** en Drive con **3 secciones** separadas por `---`. Las secciones
se leen por orden:

1. **Marca**
    - **Tipo:** Enlace con el logo y el nombre (por ejemplo `:logo: Nova*Móvil*` enlazado a `/`)
    - **Descripción:** Logo y nombre de la marca; la parte en *cursiva* sale en el color de acento.
      Puede ser una imagen en lugar de `:logo:`
    - **Por defecto:** sin logo, el logo por defecto; sin nombre, "NovaMóvil"; sin enlace, `/`

2. **Menú**
    - **Tipo:** Lista con viñetas de enlaces
    - **Descripción:** Las secciones del sitio (Celulares, Planes, Accesorios, Promociones…)
    - **Por defecto:** ninguno. Una opción sin enlace se muestra como texto

3. **Herramientas**
    - **Tipo:** Lista con viñetas de enlaces con el texto **Cuenta** y **Carrito**
    - **Descripción:** A dónde llevan los iconos de cuenta y carrito (el texto del enlace dice cuál es)
    - **Por defecto:** `/cuenta` y `/carrito`

Una página puede usar otro documento con la metadata `nav` (por ejemplo `/nav-promociones`).

### Vista previa del documento en Drive

El documento en Drive permite al autor configurar:

- El **logo**, el **nombre** de la marca y su parte destacada
- Las **secciones** del menú
- Los **enlaces** de cuenta y carrito

![Vista Documento en Drive](/documentation/readme/header/drive-document.png)

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Móvil o tablet | Marca, lupa, cuenta, carrito y hamburguesa; el menú se abre debajo |
| Desktop | Marca, menú y herramientas en una sola barra; sin hamburguesa |
| Pulsar la lupa | Se despliega el campo de búsqueda |
| Buscar con el campo vacío | No se envía |
| `Escape` | Cierra el buscador; si no está abierto, cierra el menú móvil |
| Seguir un enlace del menú móvil | El menú se cierra |
| El documento no trae logo | Se pinta el logo por defecto |
| El documento no trae los enlaces de cuenta o carrito | Llevan a `/cuenta` y `/carrito` |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/header/component-desktop.png)

Desktop con el buscador abierto:

![Vista Componente desktop con buscador](/documentation/readme/header/component-desktop-search.png)

Tablet:

![Vista Componente tablet](/documentation/readme/header/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/header/component-mobile.png)

Móvil con el menú abierto:

![Vista Componente móvil con menú](/documentation/readme/header/component-mobile-menu.png)

### Archivos y dependencias

- `header.js` – Carga el documento `nav`, construye la barra y maneja el menú y el buscador
- `header.css` – Estilos de la barra (tamaños, colores y resoluciones)
- `blocks/fragment/fragment.js` – Carga el documento `nav`
- `scripts/aem.js` – `getMetadata` para la metadata `nav`
- `icons/` – `search.svg`, `user.svg`, `cart.svg`, `close.svg`
- `styles/foundations/breakpoints.css` – Resoluciones (mobile, tablet y desktop)
- Colores en `styles/colors.css` (`--header-*`) y alto de la barra en `styles/styles.css`
  (`--nav-height`)
- La marca se construye igual que en `blocks/footer/footer.js`: si cambias la marca, cámbiala en los
  dos bloques
