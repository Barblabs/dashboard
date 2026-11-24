# Navigation

## Sub-features
- Every route except `/`, `/login` and `/deactivated` needs a session; without one it redirects to `/login`, and signing in returns to the page asked for
- `/` is the public landing page for everyone (h1 "Threat intelligence for the assets your business runs on"): signed out its "Sign in" links open `/login`; signed in they read "Open dashboard" and open the role's home, platform_admin `/tenants`, customer_admin and viewer `/dashboard`
- Sidebar links by role (the active link is highlighted):
  - customer_admin: Dashboard, Findings, News, Configuration, Business context, Users
  - viewer: the same without Users
  - platform_admin: Tenants (`/tenants`), Dashboard (`/admin-dashboard`)
- A route outside the role shows "Access denied" (`/forbidden`); an unknown path shows "Page not found", whose "Back to home" opens the role's home

## How to get to it (user POV)
Sidebar on every signed-in page, or a typed URL.

## Driving it with Playwright
`node drive.mjs navigation`: landing signed out and its Sign in, guard to login and back to `/users`, customer_admin menu, 403 and 404 by typed URL, Back to home, landing signed in and Open dashboard, viewer without Users, platform_admin menu, 403 and Open dashboard to `/tenants`, sign out.

## Gotchas
- The session survives typed URLs, so 403/404 are reached with `goto(path)`.
- End state: URL and h1 change per click; each role sees only its links.
