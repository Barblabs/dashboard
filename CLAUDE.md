# CLAUDE.md

Barbattack dashboard: the React + Vite frontend of the Barbattack threat intelligence system (CMDB asset inventory and prioritized vulnerability findings), backed by barbackend. TypeScript, Tailwind, Base UI, react-query, react-router, i18next, MSW, Vitest.

## Project map

- `src/api/` - axios `apiClient`, `ApiError`, generated contract types (`generated.ts`), one react-query module per domain
- `src/auth/` - session, Cognito (or mock) tokens, role permissions
- `src/components/` - shared components; `ui/` holds primitives over Base UI + Tailwind
- `src/i18n/` - i18next setup, `locales/en.ts` and `es.ts`
- `src/mocks/` - MSW handlers (`handlers/`, one per domain) and `*-store.ts` mock data, shared by tests and dev mock mode
- `src/pages/` - one folder per page; routes in `src/routes.ts`, session and role guards in `src/App.tsx`
- `src/test/` - Vitest setup, MSW Node server, `renderApp` helpers
- `CODING_STANDARDS.md` - review rules no check catches
- `README.md` - setup, env vars, mock mode, scripts
- `CONTRIBUTING.md` - which dependency to use for what, i18n and testing conventions
- `docs/deploy.md` - S3 + CloudFront deploy and what Terraform must provide

<important if="you need to run commands to build, test, lint, typecheck, or generate code">

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 (`VITE_USE_MOCK=true` in `.env` for mock mode, no backend or Cognito) |
| `npm run build` | `tsc -b` + Vite build to `dist/` |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint, type-aware, warnings are errors |
| `npm run knip` | Unused files, exports and dependencies |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest watch mode |
| `npm run gen:types` | Regenerate `src/api/generated.ts` from barbackend's OpenAPI (backend must run on :8080) |
| `npm run preview` | Serve `dist/` locally |

The pre-commit hook runs `typecheck`, `lint`, `knip` and `test`.
</important>

<important if="you are writing or reviewing a change before committing or opening a PR">
- Apply every rule in `CODING_STANDARDS.md` to the diff
</important>

<important if="you are calling backend endpoints or adding API types, queries or mutations">
- Every endpoint is a function in a `src/api/<domain>.ts` module that goes through `apiClient`; components never call axios or `fetch`
- Types derive from `Schemas` in the generated spec, never hand-written mirrors
- Writes update the cache from the response (`setQueryData`) instead of refetching; never copy server data into `useState`
- Connection-dependent data goes under `connectionScopeKey`
</important>

<important if="you are adding or changing a backend endpoint's mock or MSW handler">
- Handlers live in `src/mocks/handlers/` and mirror barbackend's check order, status codes and error codes
- Mock data persists via `localStore()` in a `*-store.ts` per resource
</important>

<important if="you are writing or modifying tests">
- Render the whole app with `renderApp` from `src/test/render.tsx` against the MSW mocks; query by role, label or visible text, interact with `user-event`
- Override a handler with a URL built by `apiUrl()` from `src/mocks/url.ts`
- Tests sit next to the code they exercise and run in English
</important>

<important if="you are adding or changing user-visible text">
- All visible text goes through `t('key')`; keys live in `src/i18n/locales/en.ts` (defines the type) and `es.ts` (must match)
- Reuse an existing key for the same concept instead of adding a duplicate
- Zod schema error messages are translation keys, not text
</important>

<important if="you are building UI components or styling">
- Tailwind utilities in JSX only; no `@apply` or per-component stylesheets
- New colors and fonts go in `@theme` in `src/styles/globals.css`
- Features use the primitives in `src/components/ui/`; a new interactive control wraps Base UI as a new primitive there
</important>

<important if="you are adding a page or changing routing or role access">
- Add the page to `PAGES` in `src/routes.ts`; session and role guards are in `src/App.tsx`
</important>

<important if="you are working on authentication or tokens">
- `aws-amplify` is used only in `src/auth/cognito.ts`; the rest of the app gets tokens from `src/auth/tokenSource.ts`
- Zustand holds only shared client UI state (today, the session in `src/auth/store.ts`)
</important>

<important if="you need to show a src/ change working in the real UI">
- Use the `verify-dashboard` skill
</important>

<important if="you are creating, reading, labeling or triaging GitHub issues">
- Issues live in GitHub Issues for `Barblabs/dashboard`, via `gh`. See `docs/agents/issue-tracker.md`
- Triage labels: `implementation` (ready-for-agent) and `hands-on` (ready-for-human). See `docs/agents/triage-labels.md`
</important>

<important if="you are naming domain concepts or making architectural decisions">
- Single-context domain docs: one `GLOSSARY.md` and `docs/adr/` at the repo root (proceed silently if absent). See `docs/agents/domain.md`
</important>
