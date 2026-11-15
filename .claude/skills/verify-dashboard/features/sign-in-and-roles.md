# Sign in and roles

## Sub-features
- Real mode: "Sign in" form (labels "Email", "Password") against Cognito, a "Create password" step for a temporary password, then `GET /me` sets the role. Errors show in an alert ("Incorrect email or password.", "Your account is disabled. Contact your administrator.", ...)
- Mock mode (this skill): "Test mode" role picker with buttons "Super Admin (platform_admin)", "Admin (customer_admin)", "Viewer (viewer)"; no `/me` call
- After sign-in: platform_admin lands on `/tenants`, the others on `/config`
- Sidebar footer: user card (email and role label) and "Sign out", which returns to `/login`; platform_admin also gets a "Super Admin" badge under the logo
- The session is memory only: a reload lands on `/login`
- Organization deactivated mid-session (API 403 `customer_deactivated`) redirects to `/deactivated`: heading "Organization deactivated" and a "Sign out" button

## How to get to it (user POV)
Open any page without a session.

## Driving it with Playwright
Covered by `node drive.mjs navigation` (role picker, landing per role, user card email, sign out) and by the reload steps in `connect` and `language`. Use `signIn(role)` / `signOut()` in `drive.mjs` for new scenarios.

Unreachable here:
- The Cognito form, the new-password step and its errors: need `VITE_USE_MOCK` off, the `VITE_COGNITO_*` pool from `.env`, a test user (one in FORCE_CHANGE_PASSWORD for the new-password step), and a backend answering `/me`.
- The deactivated redirect: no MSW handler returns 403 `customer_deactivated`; needs a real backend with a deactivated organization. `/deactivated` itself has no guard and can be opened directly to see the static page.

## Gotchas
- Mock users are `superadmin@`, `admin@` and `viewer@barbattack.example`; they do not match the Users page fixtures (`@acme.example`).
- End state: each role lands on its page and sees only its menu; Sign out shows the role picker again.
