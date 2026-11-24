# Sign in and roles

## Sub-features
- Real mode: "Sign in" form (labels "Email", "Password") against Cognito, a "Create password" step for a temporary password, then `GET /me` sets the role. Errors show in an alert ("Incorrect email or password.", "Your account is disabled. Contact your administrator.", "Could not connect to the server.", ...)
- Mock mode (this skill): "Test mode" role picker with buttons "Super Admin (platform_admin)", "Admin (customer_admin)", "Viewer (viewer)"; picking one stores the role in localStorage and then calls `GET /me`, which the mock answers as that role
- After sign-in: back to the page the guard turned away, otherwise platform_admin lands on `/tenants` and the others on `/dashboard`
- The session persists: a reload, a typed URL or a new tab stay signed in (a "Loading…" screen shows while it is restored); signing out in one tab ends the session in the others
- Sidebar footer: user card (email and role label) and "Sign out", which returns to `/login`; platform_admin also gets a "Super Admin" badge under the logo
- `/me` out of reach while restoring shows "Cannot connect to the server" with "Retry" and keeps the session
- Organization deactivated (API 403 `customer_deactivated`) redirects to `/deactivated`: heading "Organization deactivated" and a "Sign out" button

## How to get to it (user POV)
Open any page without a session.

## Driving it with Playwright
Covered by `node drive.mjs navigation` (guard and return, role picker, landing per role, user card email, sign out) and by the reload steps in `connect`, `findings` and `language`. Use `signIn(role, landing)` / `signOut({ fresh })` in `drive.mjs` for new scenarios.

Unreachable here:
- The Cognito form, the new-password step and its errors: need `VITE_USE_MOCK` off, the `VITE_COGNITO_*` pool from `.env`, a test user (one in FORCE_CHANGE_PASSWORD for the new-password step), and a backend answering `/me`.
- The deactivated redirect and the "Cannot connect to the server" screen: the MSW `/me` handler always answers 200 and nothing returns 403 `customer_deactivated`; both need a real backend (a deactivated organization, or `/me` down). `/deactivated` has no session guard, but it redirects to the role's home (or `/login` when signed out) unless the session is deactivated, so it cannot be opened directly here.

## Gotchas
- Mock users are `superadmin@`, `admin@` and `viewer@barbattack.example`; they do not match the Users page fixtures (`@acme.example`).
- Product gap, still live on 2026-11-19: after "Sign out" the next sign-in returns to the page signed out from whenever the new role can open it (customer_admin signs out on `/findings`, a viewer signing in lands on `/findings`, not `/config`). A page the new role cannot open is dropped for its home (a viewer out on `/config`, then a Super Admin lands on `/tenants`). Opening `/login` from the landing page's "Sign in" after signing out clears it (`signOut({ fresh: true })`); reopening `/login` does not, since the browser treats it as a reload and keeps the history state.
- End state: each role lands on its page and sees only its menu; Sign out shows the role picker again.
