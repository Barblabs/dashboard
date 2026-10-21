# Dashboard — Barbattack

Frontend del sistema de threat intelligence Barbattack. Muestra el inventario
de activos del CMDB y los hallazgos de vulnerabilidades priorizados.

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

| Variable        | Descripción                                              | Ejemplo                      |
|-----------------|----------------------------------------------------------|------------------------------|
| `VITE_API_URL`  | URL base del backend (sin barra al final)                | `http://localhost:8080`      |
| `VITE_USE_MOCK` | `true` para usar datos mock sin llamar al backend        | `true`                       |

## Levantar en local

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

Para apuntar al backend real, establece `VITE_USE_MOCK=false` y asegúrate
de que el backend esté corriendo con `./barbackend serve`.

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
  api/          # cliente HTTP y tipos TypeScript del contrato
  mocks/        # datos mock con la misma forma que la respuesta real
  components/   # componentes reutilizables (Sidebar, etc.)
  pages/        # páginas: Config, Findings, Notifications
  styles/       # variables CSS globales (colores, tipografía)
docs/
  contrato-assets.md   # contrato propuesto del endpoint GET /assets
```

## Notas de desarrollo

- Nunca subas `.env` al repo; contiene la URL del backend.
- Nunca conectes el front directo a iTop; todo pasa por el backend.
- `VITE_USE_MOCK=true` activa el mock en `src/mocks/assets.ts`, que tiene
  exactamente la misma forma que la respuesta esperada del backend. Cuando
  el endpoint `/assets` esté listo, basta con cambiar esa variable a `false`.
