# Navigation

## Sub-features
- Every route except `/login` and `/deactivated` needs a session; without one it redirects to `/login`
- `/` redirects by role: platform_admin to `/tenants`, customer_admin and viewer to `/config`
- Sidebar links by role (the active link is highlighted):
  - customer_admin: Findings, Configuration, Business context, Notifications, Users
  - viewer: the same without Users
  - platform_admin: Tenants (`/tenants`), Dashboard (`/admin-dashboard`)
- Findings and Notifications are "Coming soon" placeholders
- A route outside the role shows "Access denied" (`/forbidden`); an unknown path shows "Page not found"

## How to get to it (user POV)
Sidebar on every signed-in page.

## Driving it with Playwright
`node drive.mjs navigation`: guard to login, customer_admin menu and placeholders, 403 and 404, viewer without Users, platform_admin menu and redirect, sign out.

## Gotchas
- Typing a URL reloads the page and signs the user out (the session is memory only), so 403/404 are reached with `openInApp(path)` (history push + popstate), not `page.goto`.
- End state: URL and h1 change per click without a full reload; each role sees only its links.
