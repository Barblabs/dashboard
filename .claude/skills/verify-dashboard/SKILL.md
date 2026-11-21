---
name: verify-dashboard
description: Launch the Barbattack dashboard (React + Vite web UI: sign-in by role, findings and action plans, CMDB connection, tech-stack inventory and asset triage, areas, Slack delivery, business context, users, super admin organizations) in dev mock mode, drive it in a real Chromium browser with Playwright, and capture screenshots plus the API calls each run made as proof. Use when a change to src/ needs to be shown working in the actual UI, not just in vitest.
---

# Verify the dashboard

Surface: a browser SPA (`npm run dev`, Vite). Real sign-in is Cognito and the real API (`barbackend`) lives in another repo, so this skill runs the app in its own dev mock mode (`VITE_USE_MOCK=true`, read in `src/mockMode.ts`): the login page becomes a role picker and MSW, started in the browser from `src/mocks/browser.ts`, answers every API call with the handlers in `src/mocks/handlers/`, the same ones the unit tests use. Everything the skill creates lives in `$VERIFY_HOME` (default `$TMPDIR/verify-dashboard`), never in the repo.

All commands below run from `.claude/skills/verify-dashboard/helpers/`. Requirements: Node, `curl`, `lsof`, and a Chromium-family browser (auto-detected; set `CHROME_PATH` to override).

## Launch

```bash
./setup.sh     # once: installs playwright-core into $VERIFY_HOME/tools, prints the browser it found
./launch.sh    # Vite on :15173 in mock mode, waits until it answers
```

The port is deliberately not 5173, so a developer's own dev server is never touched. `launch.sh` refuses to start if the port is busy; do not drive an instance you did not start (override with `FRONT_PORT` for a second parallel instance). The shell env beats `.env`: `VITE_USE_MOCK=true`, and `VITE_API_URL` points at `:18080`, where nothing may listen, so a call MSW does not handle fails instead of reaching a real backend (`launch.sh` refuses to start if something listens there; override with `MOCK_API_PORT`).

Ready = `launch.sh` prints `ready: frontend ...`. Log: `$VERIFY_HOME/run/frontend.log`. One instance serves every scenario; each scenario isolates itself in a fresh browser context.

## Doctor

```bash
./doctor.sh
```

Read-only. Checks the pid is ours and alive, the port answers, the served code has mock mode on and the mock API base, the MSW worker script is served, nothing listens on the mock API port, playwright and a browser exist. Any `FAIL` line: run `./cleanup.sh && ./launch.sh`. Run it before the first drive and after any failed one.

## Drive

```bash
node drive.mjs <scenario> [--headed]
```

| Scenario | Feature file | What it proves |
|---|---|---|
| `navigation` | features/navigation.md, features/sign-in-and-roles.md | login guard and return to the asked page, per-role menu and redirects, placeholder, 403, 404, sign out |
| `findings` | features/findings.md | order summary and groups, detail modal kept in the URL across a reload, action plan, folded sections, no agent named, feedback |
| `finding-closes` | features/findings.md | Feedback takes three verdict buttons and a required Why, a single Close finding in the top bar, close by hand as postponed for 30 days, counted closed at once, Closed tab, reopen from its row |
| `finding-history` | features/findings.md | the folded prioritization history under the Score (newest first, what changed, an older reason on demand), nothing about moves in the reason, a round that kept its group |
| `charts` | features/findings.md | the weekly trend from its first week with findings and what its line counts, time to close by risk level with no row for none, risk level legends, Unknown only with findings, the tactics matrix with no filter and no empty column, no "band" on screen |
| `before-after` | features/findings.md | the most significant movements have no Reason column, a row opens its Finding's detail over the tab, closing it comes back to the tab |
| `news` | features/news.md | newest digest's groups in order, Ransomware.live credit, earlier digest kept in the URL across a reload, the note when the Editor did not answer, Spanish |
| `connect` | features/connect-cmdb.md | rejected user error, test connection, connect, still connected after a reload |
| `sync-edit-disconnect` | features/manage-connection.md | sync, edit dialog, disconnect confirm |
| `viewer-readonly` | features/manage-connection.md | viewer sees the connection and inventory but no controls |
| `inventory` | features/tech-stack-inventory.md | filters send the right query, asset list and record, keyboard move, no pager |
| `triage` | features/asset-triage.md | banner count, triage queue declares a Classification and an Exposure, single sheet clears one, viewer read-only |
| `areas` | features/areas.md | set an owner (with email validation), status filter, viewer read-only |
| `slack` | features/slack.md | Connect opens Slack's consent page, channel choice, test message, retry failed deliveries, viewer read-only, disconnect |
| `language` | features/language-switcher.md | ES/EN switch persisted across a reload and onto the sign-in page |
| `business-context` | features/business-context.md | document import draft, domain cleanup, save, viewer read-only |
| `users` | features/users.md | invite, disable, last-admin refusal |
| `tenants` | features/super-admin.md | create, deactivate, duplicate refusal, dashboard |
| `phone-cards` | features/phone-cards.md | at 390x844: Findings, Users and Admin dashboard rows as cards with no sideways scroll, a Finding card opens its detail, a user disabled from its card; tables back at 1280x900 |
| `phone-stacking` | features/phone-stacking.md | at 390x844: the Config steps panel above the CMDB choice and iTop form, the connected bar's buttons and Triage them on screen (Triage them under its text), Sync now still syncs, the Organizations search full width with its count below, all with no sideways scroll; the count back beside the search at 1280x900 |
| `mobile` | features/mobile-layout.md | at 390x844: top bar, drawer contents, close on link, Escape and backdrop with focus back on Menu, full-width `main` on every page; desktop sidebar back at 1280x900 |
| `phone` | features/mobile-layout.md | on a phone context (`isMobile`, 390x844) then a fresh desktop one (1280x900): input text 16px on phones and 15px (selects 14px) on desktop, the Finding detail fills the phone screen with "Why it is here" on the first screen, the Findings tab list fades while it overflows, and on Users and Tenants (grown through the UI until they scroll) the last row ends above the Fab |

Each run uses a fresh browser context (empty storage, so the mock data starts from its fixtures and nobody is signed in), English locale, 1280x900 (`mobile`, `phone-cards` and `phone-stacking` resize to 390x844; `phone` starts on a 390x844 `isMobile` context). The session persists like the real one: the picked role lives in localStorage, so `page.goto` and reloads keep the user signed in until `signOut()`. Signing in returns to the page the guard turned away, and also to the page the previous user signed out from when the new role can open it (see the product gap in features/sign-in-and-roles.md); `signOut({ fresh: true })` opens `/` afterwards so the next `signIn(role)` lands on that role's home. The script uses ARIA roles and labels only (`getByRole`, `getByLabel`); reuse those and the helpers (`signIn`, `signOut`, `goto`, `sidebarLink`, `tab`, `assetList`, `assetOption`, `assetRecord`, `connect`) for new scenarios: add a function to the `scenarios` object in `drive.mjs`. Exit code 0 = pass, 1 = fail (a `FAILURE` screenshot is saved), 2 = unknown scenario.

The driver also hides the dev-only React Query Devtools button (it floats bottom-right over sheet and dialog footers and swallows clicks), and aborts every request outside the dev server, the mock API base and Google Fonts, recording it in `externalRequests`.

Mock data persists in the context's localStorage, one key per resource: `barbattack_mock_role` (the session), `barbattack_cmdb_source`, `barbattack_mock_assets`, `barbattack_mock_areas`, `barbattack_mock_users`, `barbattack_mock_customers`, `barbattack_mock_business_context`, `barbattack_mock_prioritizations`, `barbattack_mock_closed_findings`, `barbattack_mock_finding_history`, `barbattack_mock_news_digests`, `barbattack_slack_installation`, `barbattack_slack_deliveries`. CMDB user `admin` is always rejected with `missing_rest_profile`.

## Evidence

Each run writes `$VERIFY_HOME/evidence/<scenario>-<timestamp>/` (override the root with `EVIDENCE_DIR`):

- numbered viewport screenshots of the action and resulting state, taken once running transitions settle (`<main>` is the scroll container, so pass a locator to `shot()` to scroll the relevant part into view)
- `report.json`: pass/fail, steps, browser console errors, `apiCalls` (every call to the API base with method, path and query, status, JSON body with passwords redacted, and `servedByMock`), and `externalRequests` (blocked). A run fails if any call was not served by MSW.

Proof standards:
- Drive the real UI path (click, type, select); never set React/query state or call the API to fake a step. The one exception is `seedMockBackend(key, value)`, for backend state only a third party creates (a finished Slack OAuth); never use it for the step under test.
- A proof shows the action and its result, and cross-checks the side effect in `report.json` `apiCalls` (request body, query params), not only what is on screen.
- MSW is the only mock. Do not claim anything about the real backend, Cognito, iTop, Slack or the agents (Luna, the Drafter, the Prioritizer) from this.
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
