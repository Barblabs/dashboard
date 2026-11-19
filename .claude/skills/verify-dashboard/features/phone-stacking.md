# Phone stacking

## Sub-features
- Below 768px the Config CMDB setup (Choose your CMDB, then the iTop form) puts the navy steps panel above the content, both full width
- Below 768px the connected bar wraps: the URL, user and last sync break onto new lines and Disconnect, Edit connection and Sync now stay fully on screen
- Below 768px the tech stack triage banner puts "Triage them" under its text, which uses the full width
- Below 768px a search field (Organizations, Users) takes the full width and its count sits on the line below
- Below 768px the Cognito sign-in and set-new-password pages hide the navy brand panel and show the logo above a full-width form (not reachable in mock mode, see Gotchas)
- `main` does not scroll sideways on any of these; at 768px and wider they sit side by side as before

## How to get to it (user POV)
Configuration (customer_admin) before and after connecting iTop, and Organizations (platform_admin), on a phone-sized screen.

## Driving it with Playwright
`node drive.mjs phone-stacking`: 390x844, checks `main.scrollWidth === main.clientWidth` on the CMDB choice, the iTop form, the connected Config page and Organizations; checks the steps panel sits above the choice, the bar's three buttons and Triage them are on screen, Triage them is under the banner text, and Sync now still syncs (cross-checked against `POST /cmdb/source/sync`); checks the search is full width with the count under it, then at 1280x900 that the count is back beside the search.

## Gotchas
- Sign out lives in the drawer on phones: open Menu first.
- The Cognito sign-in is replaced by the role picker in mock mode. To see its layout, run a dev server with `VITE_USE_MOCK=false` and open `/login`; the form renders without signing in.
