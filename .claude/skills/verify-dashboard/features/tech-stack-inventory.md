# Tech stack inventory

## Sub-features
- Table of assets (name, record id, type, OS, criticality, owner, status)
- Filters: Status (Active default / Inactive / All), Type, Criticality; total count text ("N assets")
- Row expand/collapse for details ("Show details of <name>" / "Hide details of <name>"; clicking the row also toggles), with software components and an "Unidentified" badge
- "No assets match these filters." empty state; load error with "Try again"
- Pagination ("Previous"/"Next", "Page N"), only when the API returns a cursor

## How to get to it (user POV)
Connected view of `/config`, below the connection bar. customer_admin and viewer both see it.

## Driving it with Playwright
`node drive.mjs inventory` (labels "Status", "Type", "Criticality" are native selects: `selectOption`). Not covered: pagination, because the MSW assets handler never returns `next_cursor`.

## Gotchas
- The fixtures are `src/test/mocks/assets.ts`: 5 assets in total, 4 active, 2 servers; `prod-api-01` has the unidentified `internal-billing-agent`.
- Every page request repeats the filters; check `report.json` `apiCalls` for the exact query.
- End state: the count text and rows match the filter, details expand, and the last `GET /assets` has `active=all`, `kind=server`, `criticality=low`.
