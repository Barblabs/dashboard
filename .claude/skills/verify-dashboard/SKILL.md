---
name: verify-dashboard
description: Launch the Barbattack dashboard (React + Vite web UI: sign-in by role, CMDB connection, tech-stack inventory, business context, users, super admin organizations) in dev mock mode, drive it in a real Chromium browser with Playwright, and capture screenshots plus the API calls each run made as proof. Use when a change to src/ needs to be shown working in the actual UI, not just in vitest.
---

# Verify the dashboard

Surface: a browser SPA (`npm run dev`, Vite). Real sign-in is Cognito and the real API (`barbackend`) lives in another repo, so this skill runs the app in its own dev mock mode (`VITE_USE_MOCK=true`): the login page becomes a role picker and MSW, started in the browser from `src/mocks/browser.ts`, answers every API call with the handlers in `src/test/mocks/handlers/`, the same ones the unit tests use. Everything the skill creates lives in `$VERIFY_HOME` (default `$TMPDIR/verify-dashboard`), never in the repo.

All commands below run from `.claude/skills/verify-dashboard/helpers/`. Requirements: Node, `curl`, `lsof`, and a Chromium-family browser (auto-detected; set `CHROME_PATH` to override).

## Launch

```bash
./setup.sh     # once: installs playwright-core into $VERIFY_HOME/tools, prints the browser it found
./launch.sh    # Vite on :15173 in mock mode, waits until it answers
```

The port is deliberately not 5173, so a developer's own dev server is never touched. `launch.sh` refuses to start if the port is busy; do not drive an instance you did not start (override with `FRONT_PORT` for a second parallel instance). The shell env beats `.env`: `VITE_USE_MOCK=true`, and `VITE_API_URL` points at `:18080`, where nothing may listen, so a call MSW does not handle fails instead of reaching a real backend (`launch.sh` refuses to start if something listens there; override with `MOCK_API_PORT`).

Ready = `launch.sh` prints `ready: frontend ...`. Log: `$VERIFY_HOME/run/frontend.log`.

## Doctor

```bash
./doctor.sh
```

Read-only. Checks the pid is ours and alive, the port answers, the served code has mock mode on and the mock API base, the MSW worker script is served, nothing listens on the mock API port, playwright and a browser exist. Any `FAIL` line: run `./cleanup.sh && ./launch.sh`.

## Drive

```bash
node drive.mjs <scenario> [--headed]
```

| Scenario | Feature file | What it proves |
|---|---|---|
| `navigation` | features/navigation.md, features/sign-in-and-roles.md | login guard, per-role menu and redirects, placeholders, 403, 404, sign out |
| `connect` | features/connect-cmdb.md | rejected user error, test connection, connect, source kept after reload + sign-in |
| `sync-edit-disconnect` | features/manage-connection.md | sync, edit dialog, disconnect confirm |
| `viewer-readonly` | features/manage-connection.md | viewer sees the connection and inventory but no controls |
| `inventory` | features/tech-stack-inventory.md | filters send the right query, details row, no pager |
| `language` | features/language-switcher.md | ES/EN switch persisted across a reload |
| `business-context` | features/business-context.md | document import draft, domain cleanup, save, viewer read-only |
| `users` | features/users.md | invite, disable, last-admin refusal |
| `tenants` | features/super-admin.md | create, deactivate, duplicate refusal, dashboard |

Each run uses a fresh browser context (empty storage, so the mock data starts from its fixtures), English locale, 1280x900. Sessions live in memory only: every page load or `page.goto` lands on `/login`. So a scenario signs in once with `signIn(role)` and then moves with sidebar clicks, or with `openInApp(path)` (history push, no reload) for a URL no link reaches. The script uses ARIA roles and labels only (`getByRole`, `getByLabel`); reuse those and the helpers for new scenarios: add a function to the `scenarios` object in `drive.mjs`. Exit code 0 = pass, 1 = fail (a `FAILURE` screenshot is saved), 2 = unknown scenario.

Mock data persists in the context's localStorage (`barbattack_cmdb_source`, `barbattack_mock_users`, `barbattack_mock_customers`, `barbattack_mock_business_context`); the mock role is in sessionStorage. CMDB user `admin` is always rejected with `missing_rest_profile`.

## Evidence

Each run writes `$VERIFY_HOME/evidence/<scenario>-<timestamp>/` (override the root with `EVIDENCE_DIR`):

- numbered viewport screenshots of the action and resulting state (`<main>` is the scroll container, so pass a locator to `shot()` to scroll the relevant part into view)
- `report.json`: pass/fail, steps, browser console errors, and `apiCalls`: every call to the API base with method, path and query, status, JSON body (passwords redacted) and `servedByMock`. A run fails if any call was not served by MSW.

Proof standards:
- Drive the real UI path (click, type, select); never set React/query state or call the API to fake a step. `openInApp` is the one exception, and only for URLs no link reaches (403, 404).
- A proof shows the action and its result, and cross-checks the side effect in `report.json` `apiCalls` (request body, query params), not only what is on screen.
- MSW is the only mock. Do not claim anything about the real backend, Cognito or iTop from this.
- Console errors are expected only for the deliberate conflicts (409 in `users` and `tenants`); anything else is a finding.
- Look at the screenshots (do not rely on PASS alone) when the change is visual.
- A feature in `features/` that was not driven is not verified; say which ones you skipped.

## Cleanup

```bash
./cleanup.sh
```

Stops only the pid recorded by `launch.sh`, and keeps `$VERIFY_HOME/evidence` and the log. Run it after every attempt, including failed ones. Delete the evidence yourself only when it is no longer needed.

## Feature map

See `features/README.md`. Keep it current when routes or UI change.
