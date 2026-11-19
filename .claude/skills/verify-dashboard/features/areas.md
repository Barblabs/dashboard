# Areas

## Sub-features
- "Areas" tab next to "Tech stack" in the connected view: heading "Areas", "N areas", the description, a Status filter (Active default / Inactive / All)
- Table: Area, Owner ("No owner" in italics when unset), Status ("Active" or "Inactive since <date>"); below 768px each area is a card (`listitem`) with its name, status, owner and owner button
- customer_admin: "Set owner" / "Edit owner" opens dialog "Owner of <area>" with "Email", "Save", "Cancel" and, with an owner, "Remove owner"; an invalid email shows "Enter a valid email." and is not sent
- Viewer: the same table without owner buttons

## How to get to it (user POV)
Connected view of `/config`, CMDB tab, "Areas" tab.

## Driving it with Playwright
`node drive.mjs areas`. The page has two "Status" selects once Areas is open (the hidden tech stack keeps its own); use `getByLabel('Status').last()`. Not covered: "Remove owner".

## Gotchas
- Fixtures `src/mocks/areas.ts`: Infrastructure (owner `infra-lead@example.com`), Data Platform (no owner), Legacy ERP (inactive). Mock state: localStorage `barbattack_mock_areas`.
- The areas are only requested once their tab opens.
- End state: Data Platform shows `data-lead@example.com` for admin and viewer, one `PUT /areas/2/owner`, "3 areas" with All.
