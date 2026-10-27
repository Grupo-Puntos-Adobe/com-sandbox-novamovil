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

<div class="account-profile"></div>

## Componente Account Profile

Este componente muestra **los datos del usuario que inició sesión** en la página **Mi cuenta**
(`/cuenta`): sus iniciales, su nombre, si la cuenta está verificada, sus datos (correo, teléfono,
número de cliente) y el botón **Cerrar sesión**.
Es un bloque sencillo: no llama a ningún servicio, toma todo de la sesión con **un solo llamado** a
`getSessionData()` (`scripts/foundations/session.js`).

### Características

- Lee la sesión con un solo llamado: `const { user, fields } = getSessionData();`
- Iniciales del usuario en un círculo (avatar) y su nombre completo
- Insignia "Cuenta verificada" solo si el usuario está verificado
- Un renglón por dato; **el autor decide qué datos se ven**: solo se pinta el dato cuya fila de
  etiqueta tiene texto (`Name Label`, `Email Label`, `Phone Label`, `User Id Label`)
- Botón "Cerrar sesión" (`logoutUser()`): borra la sesión y la página `cuenta` manda sola a `/login`
- Sin sesión (por ejemplo en el panel de edición) muestra el `Empty Text`
- Se vuelve a pintar solo si la sesión cambia en la página (`SESSION_CHANGE_EVENT`)
- Grid de 24 columnas: en móvil la etiqueta va arriba del valor; en tablet y desktop, a un lado
- Estilos y clases extra del autor con las filas `Styles` y `Classname`
- Accesible: el título es un encabezado de nivel 2 y los datos son una tabla (`role="table"`) con
  la etiqueta como encabezado de fila

### Cómo recupera los datos de la sesión (paso a paso)

**1. Un solo llamado trae todo.** En `account-profile.js`:

```js
import { getSessionData } from '../../scripts/foundations/session.js';

const { user, fields } = getSessionData();
```

**2. Qué llega.** Con la sesión del usuario de prueba (`cliente@ejemplo.com`):

```js
user = {
  userId: 'USR-10001',
  firstName: 'Cliente',
  lastName: 'Nova',
  fullName: 'Cliente Nova',
  email: 'cliente@ejemplo.com',
  phone: '5512345678',
  verified: true,
  sessionId: 'SES-LOGIN-001',
};

fields = [
  { key: 'fullName', value: 'Cliente Nova' },
  { key: 'email', value: 'cliente@ejemplo.com' },
  { key: 'phone', value: '5512345678' },
  { key: 'userId', value: 'USR-10001' },
  { key: 'verified', value: true },
  { key: 'sessionId', value: 'SES-LOGIN-001' },
];
```

Sin sesión: `user = null` y `fields = []`. Nunca trae el token.

**3. El bloque solo decide qué pintar y con qué texto.** Cada `key` tiene su fila de etiqueta en
Drive (`FIELD_LABEL_ROWS`); si la fila no tiene texto, ese dato no se pinta:

```js
const FIELD_LABEL_ROWS = {
  fullName: 'name label',     // | Name Label    | Nombre             |
  email: 'email label',       // | Email Label   | Correo electrónico |
  phone: 'phone label',       // | Phone Label   | Teléfono           |
  userId: 'user id label',    // | User Id Label | Número de cliente  |
};

fields
  .filter(({ key }) => settings.labels[key])          // solo los que tienen etiqueta
  .forEach(({ key, value }) => paint(settings.labels[key], value));
```

`user` se usa para lo que no es un renglón: las iniciales (`firstName`, `lastName`), el nombre
(`fullName`) y la insignia (`verified`).

**4. Si la sesión cambia**, el evento trae lo mismo que `getSessionData()`:

```js
document.addEventListener(SESSION_CHANGE_EVENT, (event) => {
  renderAccountProfile(block, settings, event.detail);   // event.detail = getSessionData()
});
```

### Estructura / Descripción de clases

El componente usa el nombre del bloque como prefijo de todas sus clases (`account-profile-*`) y
todos sus estilos van dentro de `.account-profile`. Se construye con `div` y roles ARIA, excepto el
botón (`button`).

- `account-profile` – Contenedor principal del componente (el bloque)
- `account-profile-title` – Título (`role="heading"`, `aria-level="2"`)
- `account-profile-card` – Tarjeta con los datos
- `account-profile-header` – Avatar y nombre
- `account-profile-avatar` – Círculo con las iniciales (`aria-hidden`: el nombre ya se lee)
- `account-profile-identity` – Nombre e insignia
- `account-profile-name` – Nombre completo
- `account-profile-badge` – "Cuenta verificada" (solo si `user.verified`)
- `account-profile-data` + `container-fluid` (`role="table"`) – Los datos
- `account-profile-field` + `row row-gutter-16` (`role="row"`) – Un dato
- `account-profile-label` + `col-24 col-md-8 col-lg-6` (`role="rowheader"`) – Etiqueta
- `account-profile-value` + `col-24 col-md-16 col-lg-18` (`role="cell"`) – Valor
- `account-profile-sign-out` – Botón "Cerrar sesión"
- `account-profile-empty` – Texto sin sesión

```text
div.account-profile
└─ div.container-fluid
   └─ div.row.row-gutter-16.row-gutter-y-16
      ├─ div.col-24 > div.account-profile-title[role=heading][aria-level=2]
      └─ div.col-24 > div.account-profile-card              (sin sesión: div.account-profile-empty)
         ├─ div.account-profile-header
         │  ├─ div.account-profile-avatar[aria-hidden]
         │  └─ div.account-profile-identity
         │     ├─ div.account-profile-name
         │     └─ div.account-profile-badge
         ├─ div.account-profile-data.container-fluid[role=table]
         │  └─ div.account-profile-field.row.row-gutter-16[role=row]   × cada dato con etiqueta
         │     ├─ div.account-profile-label.col-24.col-md-8.col-lg-6[role=rowheader]
         │     └─ div.account-profile-value.col-24.col-md-16.col-lg-18[role=cell]
         └─ button.account-profile-sign-out
```

### Resoluciones

| Resolución | Etiqueta y valor | Tarjeta | Título |
|---|---|---|---|
| mobile (< 768 px) | Etiqueta arriba, valor abajo (`col-24` cada uno) | padding 20 px | 20 px |
| tablet (768–991 px) | En la misma línea: etiqueta 8 de 24 columnas | padding 28 px | 20 px |
| desktop (≥ 992 px) | En la misma línea: etiqueta 6 de 24 columnas | padding 28 px | 24 px |

### Estructura de la tabla en Drive

El autor escribe una tabla **Account Profile**. Todas las filas son opcionales; las de contenido no
tienen texto por defecto: sin texto, esa parte no se pinta.

1. **`Styles`** / **`Classname`** / **`Session`**
    - **Tipo:** Texto / `true` / `false`
    - **Descripción:** Estilos, clases extra y quién ve el bloque (ver
      `documentation/06-styles-classname.md`). La página `cuenta` ya pide sesión en su Metadata,
      así que no hace falta `Session`
    - **Por defecto:** ninguno

2. **`Title`**
    - **Tipo:** Texto
    - **Descripción:** Título del bloque ("Tus datos")

3. **`Name Label`** / **`Email Label`** / **`Phone Label`** / **`User Id Label`**
    - **Tipo:** Texto
    - **Descripción:** La etiqueta de cada dato del usuario (`fullName`, `email`, `phone`,
      `userId`). **Sin texto, ese dato no se muestra.** Un dato vacío en la sesión tampoco se
      muestra
    - **Por defecto:** ninguna

4. **`Verified Text`**
    - **Tipo:** Texto
    - **Descripción:** Insignia que se ve solo si el usuario está verificado ("Cuenta verificada")

5. **`Sign Out Text`**
    - **Tipo:** Texto
    - **Descripción:** Botón para cerrar sesión. Sin texto, no hay botón

6. **`Empty Text`**
    - **Tipo:** Texto
    - **Descripción:** Lo que se ve sin sesión (por ejemplo en el panel de edición, donde la
      página no redirige)

### Vista previa de la tabla en Drive

La tabla en Drive permite al autor configurar:

- El **título** y **qué datos** del usuario se ven (con la etiqueta de cada uno)
- La **insignia** de verificado, el **botón** de cerrar sesión y el **texto sin sesión**

![Vista Tabla en Drive](/documentation/readme/account-profile/drive-table.png)

### Comportamiento

| Caso | Qué se ve |
|---|---|
| Con sesión | Avatar "CN", "Cliente Nova", "Cuenta verificada", los 4 datos y "Cerrar sesión" |
| Usuario sin verificar | Sin la insignia |
| Una fila de etiqueta vacía (por ejemplo `Phone Label`) | Ese dato no se pinta |
| Un dato vacío en la sesión (por ejemplo sin teléfono) | Ese renglón no se pinta |
| Clic en "Cerrar sesión" | Se borra la sesión y `/cuenta` (Metadata `Session: true`) manda a `/login` |
| Sin sesión o como invitado | La página `cuenta` manda a `/login` antes de pintarse |
| Panel de edición (sin sesión) | Título y `Empty Text`, para poder editarlo |

### Cómo probarlo

1. Iniciar sesión en `/login` (usuario del mock): la página manda a `/cuenta`.
2. En `/cuenta` se ven "Tus datos" con el nombre, la insignia y los datos.
3. Clic en **Cerrar sesión**: va a `/login`.
4. Abrir `/cuenta` sin sesión: va a `/login`.

### Vista previa

Desktop:

![Vista Componente desktop](/documentation/readme/account-profile/component-desktop.png)

Tablet:

![Vista Componente tablet](/documentation/readme/account-profile/component-tablet.png)

Móvil:

![Vista Componente móvil](/documentation/readme/account-profile/component-mobile.png)

### Archivos y dependencias

- `account-profile.js` – Lee la tabla, pide los datos con `getSessionData()` y pinta la tarjeta
- `account-profile.css` – Estilos del bloque, todos dentro de `.account-profile`
- `scripts/foundations/session.js` – `getSessionData` (datos), `logoutUser` (cerrar sesión) y
  `SESSION_CHANGE_EVENT`
- `scripts/foundations/block-options.js` – Filas `Styles`, `Classname` y `Session`
- `scripts/foundations/block-utils.js` – `readTableCell`
- `styles/foundations/grid.css` y `breakpoints.css` – Columnas y resoluciones
- Colores en `styles/colors.css` (`--account-profile-*`)
- Documento de Drive: `content-drive/cuenta.docx` (página `/cuenta`, Metadata `Session: true` y
  `Redirect To: /login`)
- Guías: `documentation/08-sesiones.md` (sesiones) y `scripts/foundations/README.md`
  (`getSessionData`)
