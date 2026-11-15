# Super admin: organizations and dashboard

## Sub-features
- `/tenants` (sidebar "Tenants", heading "Organizations"), platform_admin only: cards with name, created date, status; search box; counter ("3 organizations · 1 deactivated")
- "New organization" two-step dialog: "Organization name", "Next", then "Admin email", "Create and send invitation"; a taken name shows "An organization with this name already exists."
- Per card: "Rename" (dialog "Rename organization"), "Deactivate" (dialog "Deactivate organization" / "Yes, deactivate"), "Reactivate" (immediate)
- `/admin-dashboard` (sidebar "Dashboard"): stat cards Organizations / Active / Deactivated / New this month, chart "New organizations per month", "Recent organizations"; read only

## How to get to it (user POV)
Sign in as platform_admin; it lands on `/tenants`.

## Driving it with Playwright
`node drive.mjs tenants`. Scope card buttons with `getByTestId('customer-card').filter({ hasText })`; use `exact: true` for "Deactivate". "Admin email" is both the step-2 dialog name and the input label, so use `getByRole('textbox', { name: 'Admin email' })`. Not covered: Rename, Reactivate, search.

## Gotchas
- Fixtures: Acme Corp, Beta Ltd (active), Gamma Inc (deactivated). Mock state: localStorage `barbattack_mock_customers`.
- "New this month" depends on today's date against the fixture dates.
- The chart has no accessible bars; check it in the screenshot.
- End state: "4 organizations · 2 deactivated", the duplicate alert, and the dashboard reading 4 / 2 / 2 / 2 in November 2026.
