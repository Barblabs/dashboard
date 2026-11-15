# Tech stack inventory

## Sub-features
- "Tech stack" heading with the total ("N assets"), filters (group "Filter assets"): Status (Active default / Inactive / All), Type, Criticality
- Triage banner under the filters (see asset-triage.md)
- An asset list (listbox "Tech stack": name, type, area or "No Area", criticality, an orange dot when the asset has a gap) beside the selected asset's record; the first asset is selected, clicking or ↑ ↓ / Home / End moves the selection
- Record (article named after the asset): type, record id, status, criticality, Lifecycle Stage, Exposure and Information Classification buttons (open the triage sheet), owner (with "Declared" badge), area, hardware, retired, Software Components with an "Unidentified" badge and "N of M unidentified"
- "No assets match these filters." / "There are no assets in the inventory."; load error with retry
- Pagination ("Page N", "Previous"/"Next", nav "Pages") in the list footer, only when the API returns a cursor

## How to get to it (user POV)
Connected view of `/config`, CMDB tab, "Tech stack" tab (default). customer_admin and viewer both see it.

## Driving it with Playwright
`node drive.mjs inventory` (labels "Status", "Type", "Criticality" are native selects: `selectOption`; helpers `assetList()`, `assetOption(name)`, `assetRecord(name)`). Not covered: pagination, because the MSW assets handler never returns `next_cursor`.

## Gotchas
- The fixtures are `src/mocks/assets.ts`: 8 assets, 7 active (`erp-app-02` is inactive), 2 servers (`prod-api-01`, `crm-db-primary`); `prod-api-01` has the unidentified `internal-billing-agent`.
- Every page request repeats the filters; check `report.json` `apiCalls` for the exact query.
- End state: the count text and options match the filter, the record follows the selection, and the last `GET /assets` has `active=all`, `kind=server`, `criticality=low`.
