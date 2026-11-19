# Tech stack inventory

## Sub-features
- "Tech stack" heading with the total ("N assets"), filters (group "Filter assets"): Status (Active default / Inactive / All) always shown, then a "Filters" disclosure ("Filters · N" and a "Clear" button while any is set; closed unless a filter is already set) holding Type, Criticality, Exposure, Information Classification, Lifecycle Stage and Area as multi-selects with removable chips (Criticality and Exposure also offer Unknown, sent as `unknown`; Information Classification offers Unclassified, sent as `unclassified`; Area lists every Area from `GET /areas?active=all`, Inactive ones as "<name> (inactive)", sent as ids, and is disabled until they load); Lifecycle Stage offers Production, Implementation, In stock and Unknown, sent as `lifecycle_stage`; several values are sent as repeated keys
- Triage banner under the filters (see asset-triage.md)
- An asset list (listbox "Tech stack": name, type, area or "No Area", criticality, an orange dot when the asset has a gap) beside the selected asset's record; the first asset is selected, clicking or ↑ ↓ / Home / End moves the selection
- Record (article named after the asset): type, record id, status, criticality, Lifecycle Stage, Exposure and Information Classification buttons (open the triage sheet), owner (with "Declared" badge), area, hardware, retired, Software Components with an "Unidentified" badge and "N of M unidentified"
- "No assets match these filters." / "There are no assets in the inventory."; load error with retry
- Pagination ("Page N", "Previous"/"Next", nav "Pages") in the list footer, only when the API returns a cursor

## How to get to it (user POV)
Connected view of `/config`, CMDB tab, "Tech stack" tab (default). customer_admin and viewer both see it.

## Driving it with Playwright
`node drive.mjs inventory` ("Status" is a native select: `selectOption`; open the disclosure first with the button named `/^Filters/` (it stays open after that); "Type", "Criticality", "Exposure", "Information Classification" and "Area" are comboboxes whose list stays open between picks, so click the options then press Escape, and remove a chip with the "Remove <value>" button; helpers `assetList()`, `assetOption(name)`, `assetRecord(name)`). Not covered: pagination, because the MSW assets handler never returns `next_cursor`; the Lifecycle Stage filter and "Clear".

## Gotchas
- The fixtures are `src/mocks/assets.ts`: 8 assets, 7 active (`erp-app-02` is inactive), 2 servers (`prod-api-01`, `crm-db-primary`); `prod-api-01` has the unidentified `internal-billing-agent`.
- Every page request repeats the filters; check `report.json` `apiCalls` for the exact query.
- Proven: two Kinds send `kind=server&kind=virtual_machine`; Server + Low sends `active=all&kind=server&criticality=low`; Unknown Criticality under Status All lists only `erp-app-02`, the one fixture without a Criticality; Unknown Exposure under Active lists 4 assets, not `ledger-db` (no Exposure from iTop, but Declared); adding Public + Unclassified sends `information_classification=public&information_classification=unclassified` and still lists 4; Infrastructure + Legacy ERP (inactive) under Status All sends `area=1&area=3` and lists 5 assets, `erp-app-02` among them.
