# Super admin: organizations and dashboard

## Sub-features
- `/tenants` (sidebar and heading "Organizations"), platform_admin only: cards with name, created date, status ("Deactivated · their users cannot sign in" when deactivated); search box; counter ("3 organizations · 1 deactivated")
- "New organization" two-step dialog: "Organization name", "Next", then "Admin email", "Create and send invitation"; a taken name shows "An organization with this name already exists."
- Per card, icon-only buttons named by `aria-label`: "Rename" (dialog "Rename organization"), "Deactivate" (dialog "Deactivate organization" / "Yes, deactivate"), "Reactivate" (immediate; only on deactivated cards, "Deactivate" only on active ones)
- `/admin-dashboard` (sidebar "Dashboard"): stat cards Organizations (with "N active · N deactivated"), Total users, CMDB connected ("N of M"), Failed syncs (30 days); charts "New organizations per month" and "Syncs per day (30 days)"; "Slack alerts by organization (30 days)"; the "Organizations" table (cards on phones, see phone-cards.md); read only

## How to get to it (user POV)
Sign in as platform_admin; it lands on `/tenants`.

## Driving it with Playwright
`node drive.mjs tenants`. Scope card buttons with `getByTestId('customer-card').filter({ hasText })`; use `exact: true` for "Deactivate". "Admin email" is both the step-2 dialog name and the input label, so use `getByRole('textbox', { name: 'Admin email' })`. Not covered: Rename, Reactivate, search.

## Gotchas
- Fixtures: Acme Corp, Beta Ltd (active), Gamma Inc (deactivated). Mock state: localStorage `barbattack_mock_customers`.
- The stat cards, the Organizations table, the syncs chart and the Slack list come from static mock endpoints (`src/mocks/handlers/adminStats.ts`), not from the Tenants store, so creating or deactivating does not move them. Only "New organizations per month" reads the live store, bucketing `created_at` into the last 6 months by today's date.
- The chart has no accessible bars; check it in the screenshot.
- End state: "4 organizations · 2 deactivated", the duplicate alert, and the dashboard showing Organizations 3 (2 active · 1 deactivated), Total users 9, CMDB connected 2 of 3, Failed syncs 3.
