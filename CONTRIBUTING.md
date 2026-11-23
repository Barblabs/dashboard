# Contribuir

Antes de abrir un PR, aplica las reglas de
[CODING_STANDARDS.md](CODING_STANDARDS.md) al diff. El hook de pre-commit
corre `typecheck`, `lint`, `knip` y `test`; si alguno falla, el commit no se
crea.

## Estructura

```
src/
  api/          # apiClient (axios), ApiError, tipos del contrato (generated.ts) y un módulo de react-query por dominio
  auth/         # sesión, tokens de Cognito (o del modo mock) y permisos por rol
  components/   # componentes compartidos; ui/ tiene las primitivas sobre Base UI
  i18n/         # i18next y los recursos en/es
  mocks/        # handlers de MSW y datos de ejemplo, compartidos por las pruebas y el modo mock
  pages/        # una carpeta por página
  styles/       # globals.css: Tailwind y tokens del tema
  test/         # setup de Vitest, servidor MSW y helpers para montar la app
```

## Qué usar para qué

- **Estilos**: utilidades de Tailwind en el JSX. Colores y fuentes nuevos van
  en `@theme` de `src/styles/globals.css`, la única hoja de estilos. Sin
  `@apply` ni hojas por componente.
- **Componentes**: los features usan las primitivas de `src/components/ui/`
  (`Button`, `Field`, `Input`, `Badge`...). Un control con comportamiento
  propio (menú, diálogo, tabs) envuelve el de `@base-ui/react` como primitiva
  nueva ahí.
- **HTTP**: solo a través de `apiClient` (`src/api/client.ts`), que convierte
  toda falla en `ApiError` (`kind`, `status`, `code`). Cada endpoint es una
  función en `src/api/<dominio>.ts`; ningún componente llama a axios ni a
  `fetch`.
- **Tipos del contrato**: derivan de `Schemas` en `src/api/generated.ts`, que
  está commiteado y se regenera con `npm run gen:types`.
- **Estado del servidor**: react-query. Lecturas con `useQuery`; escrituras con
  `useMutation` que actualizan la caché con la respuesta (`setQueryData`) en
  vez de volver a pedir el GET. Los datos que dependen de la conexión CMDB van
  bajo `connectionScopeKey` para que desconectar los borre. No copiar datos
  del servidor a `useState`.
- **Estado de cliente**: `useState` para lo local; zustand solo para estado de
  UI compartido entre ramas lejanas del árbol (hoy, la sesión en
  `src/auth/store.ts`).
- **Formularios**: react-hook-form con un esquema zod conectado por
  `zodResolver`. Los mensajes de error del esquema son claves de traducción.
- **Ruteo**: react-router. Una página nueva se agrega a `PAGES` en
  `src/routes.ts`; las guardas de sesión y de rol viven en `src/App.tsx`.
- **Autenticación**: `aws-amplify` solo dentro de `src/auth/cognito.ts`; el
  resto de la app pide tokens a `src/auth/tokenSource.ts`.

## Traducciones

La UI está en inglés y español. El idioma se detecta del navegador (`es-*` usa
español; cualquier otro, inglés) y el selector ES/EN de la barra lateral lo
cambia y lo guarda en `localStorage`.

- Todo texto visible pasa por `t('clave')`. Las únicas excepciones son la
  marca BARBATTACK y los valores de ejemplo de los `placeholder`.
- Los textos viven en `src/i18n/locales/en.ts` y `es.ts`, con claves
  semánticas en inglés agrupadas por feature (`config.form.url.label`).
  `en.ts` define el tipo: una clave inexistente falla en `tsc`, y `es.ts` debe
  tener las mismas claves.
- Un concepto que aparece en varios lugares reusa su clave existente.

## Pruebas

Vitest con jsdom y Testing Library. Las pruebas montan la app completa con
`renderApp()` de `src/test/render.tsx`, contra un servidor MSW, y la usan como
un usuario: buscan por rol, label o texto visible e interactúan con
`user-event`. Cada prueba vive junto a lo que ejercita y corre en inglés,
salvo las de cambio de idioma.

- Hay un archivo de handlers por dominio en `src/mocks/handlers/`, que
  replica el orden de validaciones, los status y los códigos de error de
  barbackend. Un endpoint nuevo del contrato se agrega ahí.
- Para sobrescribir un handler en una prueba, arma la URL con `apiUrl()` de
  `src/mocks/url.ts`.
- Cada recurso mock persiste en `localStorage` con `localStore()`, en un
  `src/mocks/*-store.ts` por recurso. `seedSource()` prepara el estado antes
  de montar la app.
- El usuario `admin` hace fallar la prueba de conexión CMDB con el código
  `missing_rest_profile`, para probar el mensaje de error traducido.
