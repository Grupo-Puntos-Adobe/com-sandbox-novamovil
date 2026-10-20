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

<div class="login"></div>

## Componente Login

Este componente permite a los usuarios **identificarse para continuar con su compra**: iniciar
sesión con su correo o teléfono y contraseña, o continuar como invitado.
Vive en la página **login** (`/login`) y tiene dos tabs, **Iniciar sesión** y **Crear cuenta**; se
muestra uno u otro.

> **Estado actual:** solo maquetación. El servicio de inicio de sesión aún no existe: la fila
> `Endpoint` ya se lee, pero va vacía, y al dar clic en **Iniciar sesión** no pasa nada (la página
> no se recarga y no se envía nada). El tab **Crear cuenta** está vacío: su bloque se hace después.

### Características

- Título y descripción de la página
- Tabs **Iniciar sesión** / **Crear cuenta**: se muestra un panel a la vez
- Formulario con usuario (correo o teléfono) y contraseña, con autocompletado del navegador y de
  los gestores de contraseñas
- Enlace **¿Olvidaste tu contraseña?**, botón **Iniciar sesión**, separador "o" y botón
  **Continuar como invitado**
- Texto legal con enlaces a **Términos y Condiciones** y **Aviso de Privacidad**
- Todo se configura desde la tabla en Drive; si una fila no tiene texto, esa parte no se pinta
- Fila `Endpoint` lista para el servicio de inicio de sesión (por ahora vacía)
- Columna centrada con el grid (`container-fluid > row row-center > col-24`): todo el ancho en
  móvil y 420 px desde tablet
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Accesible: tabs con `role="tablist"` / `tab` / `tabpanel` (flechas, Inicio y Fin para cambiar
  de tab), cada campo con su `label`, título como encabezado de nivel 1 y foco visible
- Pintado seguro: los textos se ponen siempre como texto (nunca HTML) y solo acepta enlaces del
  mismo sitio o `http(s)`

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`login-*`) y todos sus
estilos van dentro de `.login`. Se construye con `div` y roles ARIA, excepto lo que necesita un
formulario para funcionar (`form`, `label`, `input`, `button`) y los enlaces (`a`).

- `login` – Contenedor principal del componente (el bloque)
- `login-frame` – Columna centrada del grid (`col-24`)
- `login-header` – Título y descripción
- `login-title` – Título (`role="heading"`, `aria-level="1"`)
- `login-description` – Descripción
- `login-tabs` – Tabs (`role="tablist"`)
- `login-tab` – Cada tab (`button`, `role="tab"`, `aria-selected`)
- `login-panel` – Panel de cada tab (`role="tabpanel"`); `login-panel-login` y
  `login-panel-register` (vacío por ahora)
- `login-form` – Tarjeta blanca con el formulario (`form`)
- `login-field` – Etiqueta y campo
- `login-label` – Etiqueta del campo (`label`)
- `login-input` – Campo (`input`): usuario (`autocomplete="username"`) y contraseña
  (`autocomplete="current-password"`)
- `login-forgot` / `login-forgot-link` – Enlace "¿Olvidaste tu contraseña?"
- `login-submit` – Botón "Iniciar sesión" (`button type="submit"`)
- `login-divider` / `login-divider-text` – Separador con la "o" (`role="separator"`)
- `login-guest` – Botón "Continuar como invitado" (`a`)
- `login-legal` / `login-legal-link` – Texto legal y sus enlaces

```text
div.login
└─ div.container-fluid
   └─ div.row.row-center
      └─ div.col-24.login-frame
         ├─ div.login-header
         │  ├─ div.login-title[role=heading][aria-level=1]
         │  └─ div.login-description
         ├─ div.login-tabs[role=tablist]
         │  ├─ button.login-tab[role=tab][aria-selected=true]    Iniciar sesión
         │  └─ button.login-tab[role=tab][aria-selected=false]   Crear cuenta
         ├─ div.login-panel.login-panel-login[role=tabpanel]
         │  └─ form.login-form
         │     ├─ div.login-field > label.login-label + input.login-input   × 2
         │     ├─ div.login-forgot > a.login-forgot-link
         │     ├─ button.login-submit[type=submit]
         │     ├─ div.login-divider[role=separator] > div.login-divider-text
         │     └─ a.login-guest
         ├─ div.login-panel.login-panel-register[role=tabpanel][hidden]   (vacío)
         └─ div.login-legal > a.login-legal-link × N
```

### Resoluciones

| Resolución | Columna | Espacio arriba/abajo | Título | Tarjeta |
|---|---|---|---|---|
| mobile (< 768 px) | Todo el ancho | 24 px · 32 px | 28 px | Padding 24 px, radio 18 px |
| tablet (768–991 px) | 420 px centrada | 56 px | 28 px | Padding 24 px, radio 18 px |
| desktop (≥ 992 px) | 420 px centrada | 56 px | 28 px | Padding 24 px, radio 18 px |

Campos de 44 px de alto, botón **Iniciar sesión** de 48 px y **Continuar como invitado** de 46 px
en todas las resoluciones.

### Estructura de la tabla en Drive

El autor escribe una tabla **Login** en el documento `login` de Drive. Todas las filas son
opcionales y pueden ir en cualquier orden. Son contenido, así que no tienen texto por defecto: si
la fila no existe o está vacía, esa parte no se pinta.

1. **`Styles`**
    - **Tipo:** Texto (declaraciones CSS separadas por `;`)
    - **Descripción:** Estilos en línea sobre el bloque
    - **Por defecto:** ninguno (ver `documentation/06-styles-classname.md`)

2. **`Classname`**
    - **Tipo:** Texto (nombres separados por espacio o coma)
    - **Descripción:** Clases extra sobre el bloque
    - **Por defecto:** ninguna

3. **`Title`**
    - **Tipo:** Texto
    - **Descripción:** Título de la página ("Identifica tu cuenta")
    - **Por defecto:** ninguno

4. **`Description`**
    - **Tipo:** Texto
    - **Descripción:** Texto debajo del título
    - **Por defecto:** ninguno

5. **`Login Tab`** / **`Register Tab`**
    - **Tipo:** Texto
    - **Descripción:** Texto de cada tab ("Iniciar sesión" / "Crear cuenta")
    - **Por defecto:** ninguno. Los tabs solo salen si las dos filas tienen texto; si no, solo se ve
      el formulario de inicio de sesión

6. **`Endpoint`**
    - **Tipo:** URL
    - **Descripción:** Servicio de inicio de sesión
    - **Por defecto:** ninguno. **Por ahora va vacío**: el servicio aún no existe y el botón no hace
      nada

7. **`User Label`** / **`User Placeholder`**
    - **Tipo:** Texto
    - **Descripción:** Etiqueta y texto de ejemplo del campo de usuario ("Correo electrónico o
      teléfono" / "correo@ejemplo.com")
    - **Por defecto:** ninguno. Sin etiqueta, el campo conserva su nombre para lectores de pantalla
      (`LABELS` en `login.js`)

8. **`Password Label`** / **`Password Placeholder`**
    - **Tipo:** Texto
    - **Descripción:** Etiqueta y texto de ejemplo del campo de contraseña
    - **Por defecto:** ninguno (igual que el usuario)

9. **`Forgot Password`**
    - **Tipo:** Enlace (texto y link en la celda)
    - **Descripción:** "¿Olvidaste tu contraseña?"
    - **Por defecto:** ninguno. Sin texto o sin enlace válido, no se pinta

10. **`Button Text`**
    - **Tipo:** Texto
    - **Descripción:** Botón "Iniciar sesión"
    - **Por defecto:** ninguno

11. **`Divider Text`**
    - **Tipo:** Texto
    - **Descripción:** Texto del separador ("o")
    - **Por defecto:** ninguno. El separador solo sale entre el botón y **Guest Button**; sin texto
      queda solo la línea

12. **`Guest Button`**
    - **Tipo:** Enlace
    - **Descripción:** "Continuar como invitado"
    - **Por defecto:** ninguno. Sin texto o sin enlace válido, no se pinta

13. **`Legal Text`**
    - **Tipo:** Texto con enlaces
    - **Descripción:** "Al continuar aceptas nuestros Términos y Condiciones y Aviso de Privacidad."
      Los enlaces se respetan; las negritas las pone el CSS
    - **Por defecto:** ninguno

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- El **título**, la **descripción** y los **tabs**
- Las **etiquetas** y **textos de ejemplo** de los campos
- Los **enlaces** de contraseña olvidada, invitado y textos legales
- El **Endpoint** del servicio (por ahora vacío)
- **Estilos** y **clases** extra del bloque

![Vista Tabla en Drive](/documentation/readme/login/drive-table.png)

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Al entrar | Tab **Iniciar sesión** activo y su formulario |
| Clic en **Crear cuenta** (o flechas / Inicio / Fin en los tabs) | Se oculta el formulario y se muestra el panel de crear cuenta (vacío por ahora) |
| Clic en **Iniciar sesión** (botón) | Nada: no se recarga la página ni se envía nada (el servicio aún no existe) |
| Falta `Login Tab` o `Register Tab` | Sin tabs, solo el formulario |
| Falta `Guest Button` | Sin separador ni botón de invitado |
| Un enlace no es del sitio ni `http(s)` (p. ej. `javascript:`) | Se muestra solo el texto, sin enlace |

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/login/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/login/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/login/component-mobile.png)

### Archivos y dependencias

- `login.js` – Lee la tabla y construye título, tabs, formulario y texto legal
- `login.css` – Estilos del bloque, todos dentro de `.login` (tamaños, colores y resoluciones)
- `scripts/foundations/block-options.js` – Filas `Styles` y `Classname`
- `scripts/foundations/block-utils.js` – `readTableCell` y `getSafeHref`
- `styles/foundations/grid.css` – Columna centrada (`container-fluid > row row-center > col-24`)
- `styles/foundations/breakpoints.css` – Resoluciones (mobile, tablet y desktop)
- Colores en `styles/colors.css` (`--login-*`)
- Documento de Drive: `content-drive/login.docx` (página `/login`)
- Pendiente: el servicio de inicio de sesión (`Endpoint`) y el bloque de crear cuenta (tab
  **Crear cuenta**)
