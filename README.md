# Dashboard - Barbattack

Frontend del sistema de threat intelligence Barbattack. Muestra el inventario
de activos del CMDB y los hallazgos de vulnerabilidades priorizados.

## Dependencias y cuándo usarlas

| Dependencia | Para qué | Cuándo usarla |
|---|---|---|
| `tailwindcss` + `@tailwindcss/vite` | Estilos (el plugin de Vite compila Tailwind en dev y build) | Siempre: utilidades directo en el JSX. Los tokens (colores, fuentes) viven en `@theme` de `src/styles/globals.css`; un color nuevo se agrega ahí, no como valor suelto. Sin `@apply` ni hojas de estilo por componente. |
| `@base-ui/react` | Componentes accesibles sin estilos | Como base de las primitivas de `src/components/ui/`. Los features usan esas primitivas (`Button`, `Field`, `Input`, `Badge`); si hace falta un control nuevo con comportamiento propio (menú, diálogo, tabs), se envuelve el de Base UI como primitiva nueva. |
| `axios` | HTTP | Solo a través de `apiClient` (`src/api/client.ts`), que convierte toda falla en `ApiError` (`kind`, `status`, `code`). Ningún componente llama a axios ni a `fetch` directo: cada endpoint es una función en `src/api/`. |
| `@tanstack/react-query` | Estado del servidor | Todo dato que viene del backend. Un módulo por dominio en `src/api/` (`cmdb.ts`, `assets.ts`) con sus tipos, claves y hooks; los datos que dependen de la conexión van bajo `connectionScopeKey` para que desconectar los borre. Lecturas con `useQuery`; escrituras con `useMutation` que actualizan la caché con la respuesta del contrato (`setQueryData`) en vez de volver a pedir el GET. No copiar datos del servidor a `useState`. |
| `@tanstack/react-query-devtools` | Inspeccionar la caché | Solo en desarrollo; se carga sola en `App.tsx` y no entra al build. |
| `react-hook-form` + `zod` + `@hookform/resolvers` | Formularios | Todo formulario: el esquema zod declara las reglas una vez y `zodResolver` las conecta. Los mensajes de error del esquema son claves de traducción, no texto. |
| `i18next`, `react-i18next`, `i18next-browser-languagedetector` | Traducciones | Todo texto visible, con `useTranslation()` y `t('clave')`. Ver [Idiomas](#idiomas-i18n). |
| `msw` | Backend falso de las pruebas | Solo en pruebas: handlers en `src/test/mocks/`. Un endpoint nuevo del contrato se agrega ahí. Ver [Pruebas](#pruebas). |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Pruebas | Ver [Pruebas](#pruebas). Interactuar con `user-event`, buscar por rol, label o texto, nunca por clases o estado interno. |
| `react-router`, `zustand` | Ruteo y estado global de cliente | Instaladas pero todavía sin usar. `react-router` cuando la navegación entre Hallazgos, Configuración y Notificaciones sea real. `zustand` solo para estado de UI compartido entre ramas lejanas del árbol; el estado del servidor va en react-query y el estado local en `useState`. |

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
npm install
```

## Configuración

Copia el archivo de entorno de ejemplo y edítalo:

```bash
cp .env.example .env
```

Variables disponibles:

| Variable        | Descripción                                                        | Ejemplo                 |
|-----------------|--------------------------------------------------------------------|-------------------------|
| `VITE_API_URL`  | URL base del backend (sin barra al final)                          | `http://localhost:8080` |

## Levantar en local

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

Requiere el backend corriendo con `./barbackend serve`.

## Idiomas (i18n)

La UI está en inglés y español con react-i18next.

- El idioma se detecta del navegador: cualquier locale `es-*` usa español y
  cualquier otro usa inglés, que es el idioma de respaldo.
- El selector ES/EN del pie de la barra lateral cambia el idioma; la elección
  se guarda en `localStorage` y tiene prioridad sobre el navegador.
- Los textos viven en `src/i18n/locales/en.ts` y `es.ts`, con claves
  semánticas en inglés agrupadas por feature (`config.form.url.label`).
  `en.ts` define el tipo de los recursos: una clave inexistente o mal escrita
  falla en `tsc`, y `es.ts` debe tener las mismas claves.
- Ningún texto visible va escrito directo en los componentes. Las únicas
  excepciones son la marca BARBATTACK y los valores de ejemplo de los
  `placeholder` del formulario, que no se traducen.

## Pruebas

```bash
npm test             # corre la suite una vez
npm run test:watch   # modo watch
```

Vitest con jsdom y Testing Library. Las pruebas renderizan la app completa con
sus providers reales y la usan como un usuario (roles, labels, texto
visible), contra un servidor MSW de Node. Cada archivo de prueba está junto a lo que ejercita: los flujos en
`src/pages/Config/`, el selector de idioma en `src/components/` y las
primitivas con comportamiento propio en `src/components/ui/`. La suite corre
en inglés, salvo las pruebas de cambio de idioma.

- Hay un archivo de handlers por dominio en `src/test/mocks/handlers/`,
  siguiendo la API de barbackend, y los datos de ejemplo viven en
  `src/test/mocks/`. Para sobrescribir un handler en una prueba, arma la URL
  con `apiUrl()` de `src/test/mocks/url.ts`.
- La conexión CMDB se guarda en `localStorage` (`src/test/mocks/store.ts`).
  `seedSource()` y `renderApp()` de `src/test/render.tsx` preparan el estado y
  montan la app.
- El usuario `admin` hace fallar la prueba de conexión con el código
  `missing_rest_profile`, para probar el mensaje de error traducido.

## Build de producción

```bash
npm run build    # compila TypeScript y genera dist/
npm run preview  # sirve dist/ localmente para verificar
```

## Linter

```bash
npm run lint
```

## Estructura de carpetas

```
src/
  api/            # cliente axios, ApiError, funciones del contrato y hooks de react-query
  components/     # componentes compartidos (Sidebar, PlaceholderPage)
    ui/           # primitivas sobre Base UI y Tailwind (Button, Field, Input, Badge)
  i18n/           # configuración de i18next y recursos en/es
  pages/          # páginas: Config, Findings, Notifications
  styles/         # globals.css: Tailwind y tokens del tema (colores, tipografía)
  test/           # setup de Vitest, servidor MSW de Node, handlers y datos de ejemplo
docs/
  contrato-assets.md   # contrato propuesto del endpoint GET /assets
```

## Notas de desarrollo

- Nunca subas `.env` al repo; contiene la URL del backend.
- Nunca conectes el front directo a iTop; todo pasa por el backend.
- Los estilos se escriben con utilidades de Tailwind en los componentes, sin
  `@apply` ni hojas de estilo por componente. `globals.css` es la única hoja
  de estilos.
