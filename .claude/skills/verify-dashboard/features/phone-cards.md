# Phone cards

## Sub-features
- Below 768px each Finding in a Findings group is a card: CVE, score with its band badge, "By Score" rank, status tags, then asset and component; tapping anywhere on the card opens the Finding's detail
- Below 768px each user on Users is a card: email (wrapping), its badges, the role badge and the Edit role and Disable buttons, all on screen
- Below 768px each area on the Config page's Areas tab is a card: name and record id, status, owner (or "No owner") and, for a customer_admin, "Set owner" / "Edit owner"
- Below 768px each organization in the Admin dashboard's Organizations section is a card: name, status, users, CMDB state, last sync and the failed-sync note
- Only one layout is rendered per viewport, so no table is in the page at 390px
- `main` does not scroll sideways on any of the three pages; at 768px and wider the tables are back

## How to get to it (user POV)
Findings, Users (customer_admin) and Dashboard (platform_admin) on a phone-sized screen.

## Driving it with Playwright
`node drive.mjs phone-cards`: 390x844, checks `main.scrollWidth === main.clientWidth` on each page, opens a Finding by tapping its card, disables viewer@acme.example from its card (cross-checked against `POST /users/:id/disable`), then at 1280x900 checks the three tables are back.

## Gotchas
- Sign out lives in the drawer on phones: open Menu first.
