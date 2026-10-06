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

<div class="footer footer-novamovil"></div>

## Componente Footer

Este componente permite a los usuarios **ver al final de cada página la marca, columnas de enlaces,
el copyright y los medios de pago**.
Sale en todas las páginas. Su contenido viene del documento **footer** de Drive (o del que indique
la metadata `footer` de la página). En móvil va en una columna; desde tablet, la marca y tres columnas
de enlaces en una fila.

### Características

- Marca (logo + nombre) como un solo enlace al inicio; la parte en *cursiva* del nombre sale en el
  color de acento (si no hay cursiva, se destaca "Móvil")
- Logo: la imagen del documento, el icono `:logo:` o, si no hay ninguno, el logo por defecto
- Frase debajo de la marca
- Columnas de enlaces: cada título del documento empieza una columna con lo que va debajo
- Copyright y lista de medios de pago en la parte de abajo
- Si el documento `footer` no existe, el footer sale vacío sin romper la página
- Adaptación a móvil, tablet y desktop (`styles/foundations/breakpoints.css`)
- Accesible: títulos de columna como encabezados, enlaces en listas y medios de pago como lista con
  nombre ("Medios de pago")

### Estructura / Descripción de clases

Todos los estilos van dentro de `.footer-novamovil` y solo usan clases.

- `footer-novamovil` – Contenedor principal del componente (el bloque)
- `footer-inner` – Contenedor centrado (hasta 1264 px)
- `footer-grid` – Grid de la marca y las columnas de enlaces
- `footer-brand` – Columna de la marca
- `footer-brand-link` – Enlace de la marca al inicio (`a`)
- `footer-brand-logo` – Logo (icono o `picture`)
- `footer-brand-image` – `img` del logo, si el autor puso una imagen
- `footer-brand-name` – Nombre de la marca
- `footer-brand-accent` – Parte destacada del nombre ("Móvil")
- `footer-tagline` – Frase debajo de la marca
- `footer-column` – Cada columna de enlaces
- `footer-column-title` – Título de la columna (el encabezado del documento)
- `footer-links` – Lista de enlaces de la columna
- `footer-link` – Cada enlace de la columna (`a`)
- `footer-column-text` – Texto de la columna que no es título ni lista
- `footer-bottom` – Parte de abajo (copyright + medios de pago)
- `footer-copyright` – Texto del copyright
- `footer-payments` – Lista de medios de pago (`aria-label="Medios de pago"`)
- `footer-payment` – Cada medio de pago
- `footer-inline-link` – Enlace dentro de la frase o del copyright

```text
footer
└─ div.footer.footer-novamovil
   └─ div.footer-inner
      ├─ div.footer-grid
      │  ├─ div.footer-brand
      │  │  ├─ a.footer-brand-link
      │  │  │  ├─ span.footer-brand-logo
      │  │  │  └─ span.footer-brand-name
      │  │  │     └─ em.footer-brand-accent
      │  │  └─ p.footer-tagline
      │  └─ div.footer-column   × cada título
      │     ├─ h3.footer-column-title
      │     └─ ul.footer-links
      │        └─ li > a.footer-link
      └─ div.footer-bottom
         ├─ p.footer-copyright
         └─ ul.footer-payments[aria-label="Medios de pago"]
            └─ li.footer-payment
```

### Resoluciones

| Resolución | Columnas | Parte de abajo |
|---|---|---|
| mobile (< 768 px) | 1 (marca y columnas una debajo de otra) | copyright y medios de pago uno debajo del otro |
| tablet (768–991 px) | 4 (marca + 3 columnas de enlaces) | copyright a la izquierda y medios de pago a la derecha |
| desktop (≥ 992 px) | 4 (marca + 3 columnas de enlaces) | copyright a la izquierda y medios de pago a la derecha |

### Estructura del documento en Drive

El autor escribe un documento **footer** en Drive con **3 secciones** separadas por `---`. Las
secciones se leen por orden:

1. **Marca y frase**
    - **Tipo:** Enlace con el logo y el nombre (por ejemplo `:logo: NovaMóvil` enlazado a `/`) y uno o
      varios párrafos
    - **Descripción:** Logo y nombre de la marca; los párrafos siguientes son la frase. Puede ser una
      imagen en lugar de `:logo:`
    - **Por defecto:** sin logo, el logo por defecto; sin nombre, "NovaMóvil"; sin enlace, `/`

2. **Columnas de enlaces**
    - **Tipo:** Título (por ejemplo Título 3) + lista con viñetas de enlaces, repetido por columna
    - **Descripción:** Cada título empieza una columna (Productos, Soporte, Legal) con la lista que va
      debajo
    - **Por defecto:** ninguno

3. **Copyright y medios de pago**
    - **Tipo:** Párrafo + lista con viñetas
    - **Descripción:** El párrafo es el copyright; la lista, los medios de pago (VISA, MC, PAYPAL, OXXO)
    - **Por defecto:** ninguno. Sin esta sección no se pinta la parte de abajo

Una página puede usar otro documento con la metadata `footer`.

### Vista previa del documento en Drive

El documento en Drive permite al autor configurar:

- El **logo**, el **nombre** de la marca y la **frase**
- Las **columnas** de enlaces (título y enlaces de cada una)
- El **copyright** y los **medios de pago**

![Vista Documento en Drive](/documentation/readme/footer/drive-document.png)

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Móvil | Todo en una columna |
| Tablet o desktop | Marca + 3 columnas en una fila; abajo, copyright y medios de pago en una fila |
| Un título nuevo en la sección 2 | Empieza otra columna |
| El documento no trae logo | Se pinta el logo por defecto |
| Falta la sección 3 | No se pinta la parte de abajo |
| El documento `footer` no existe | El footer sale vacío y la página carga normal |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/footer/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/footer/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/footer/component-mobile.png)

### Archivos y dependencias

- `footer.js` – Carga el documento `footer` y construye la marca, las columnas y la parte de abajo
- `footer.css` – Estilos del footer (tamaños, colores y resoluciones)
- `blocks/fragment/fragment.js` – Carga el documento `footer`
- `scripts/aem.js` – `getMetadata` para la metadata `footer`
- `styles/foundations/breakpoints.css` – Resoluciones (mobile, tablet y desktop)
- Colores en `styles/colors.css` (`--footer-*`)
- La marca se construye igual que en `blocks/header/header.js`: si cambias la marca, cámbiala en los
  dos bloques
