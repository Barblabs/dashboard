# Navigation

## Sub-features
- Every route except `/login` and `/deactivated` needs a session; without one it redirects to `/login`, and signing in returns to the page asked for
- `/` redirects by role: platform_admin to `/tenants`, customer_admin and viewer to `/config`
- Sidebar links by role (the active link is highlighted):
  - customer_admin: Findings, Configuration, Business context, Notifications, Users
  - viewer: the same without Users
  - platform_admin: Tenants (`/tenants`), Dashboard (`/admin-dashboard`)
- Notifications is a "Coming soon" placeholder (Findings is a real page, see findings.md)
- A route outside the role shows "Access denied" (`/forbidden`); an unknown path shows "Page not found"

## How to get to it (user POV)
Sidebar on every signed-in page, or a typed URL.

## Driving it with Playwright
`node drive.mjs navigation`: guard to login and back to `/users`, customer_admin menu and placeholder, 403 and 404 by typed URL, viewer without Users, platform_admin menu, 403 and redirect, sign out.

## Gotchas
- The session survives typed URLs, so 403/404 are reached with `goto(path)`.
- End state: URL and h1 change per click; each role sees only its links.
