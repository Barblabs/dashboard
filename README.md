# Dashboard - Barbattack

Frontend del sistema de threat intelligence Barbattack: muestra el inventario
de activos del CMDB y los hallazgos de vulnerabilidades priorizados. Toda la
información viene de barbackend; el
front nunca habla directo con iTop.

React, Vite, TypeScript, Tailwind, Base UI, react-query, i18next (inglés y
español) y Cognito para el inicio de sesión.

## Requisitos

- Node.js 26 (la versión de `.nvmrc`)
- npm 11+

## Inicio rápido

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Con la configuración de ejemplo, la app espera barbackend corriendo en
`http://localhost:8080` (`./barbackend serve`).

### Modo mock

Para trabajar sin backend ni Cognito, pon `VITE_USE_MOCK=true` en `.env` y
corre `npm run dev`. MSW intercepta todas las peticiones y la pantalla de login
ofrece un botón por rol (`platform_admin`, `customer_admin`, `viewer`). El
build de producción ignora esta variable.

## Configuración

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend, sin barra al final |
| `VITE_USE_MOCK` | `true` activa el modo mock (solo en `npm run dev`) |
| `VITE_COGNITO_REGION` | Región del User Pool |
| `VITE_COGNITO_USER_POOL_ID` | ID del User Pool |
| `VITE_COGNITO_CLIENT_ID` | ID del App Client |

Las variables de Cognito son obligatorias fuera del modo mock. No subas `.env`
al repo.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck y build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente |
| `npm test` | Pruebas (Vitest); `npm run test:watch` en modo watch |
| `npm run lint` | oxlint con reglas que leen los tipos |
| `npm run typecheck` | `tsc -b` |
| `npm run knip` | Archivos, exports y dependencias sin uso |
| `npm run gen:types` | Regenera `src/api/generated.ts` desde el OpenAPI de barbackend (requiere el backend en `:8080`) |

El hook de pre-commit corre `typecheck`, `lint`, `knip` y `test`.

## Despliegue

Cada push a `main` que pasa CI se compila y se sube a S3 + CloudFront. Ver
[docs/deploy.md](docs/deploy.md) para las variables del environment
`production` y lo que la infraestructura de Terraform debe proveer.

## Contribuir

- [CONTRIBUTING.md](CONTRIBUTING.md): estructura del código, qué dependencia
  usar para qué, traducciones y pruebas.
- [CODING_STANDARDS.md](CODING_STANDARDS.md): reglas de revisión.
- [docs/contrato-cmdb.md](docs/contrato-cmdb.md): contrato de los endpoints
  `/cmdb/`.
