# Manage the connection

## Sub-features
- Connected bar: "iTop connected" badge, URL, user, "Last sync: ..."
- "Sync now": shows "Sync complete." status and refreshes the inventory
- "Edit connection": modal dialog "Edit iTop connection" over the connected view; password required again
- "Disconnect": inline confirmation strip, then back to the selector
- Sync failure strip; when the sync request itself fails with `invalid_credentials`, an "Update credentials" button opens the same dialog
- Viewer: the bar and inventory without Sync now / Edit connection / Disconnect; with no source only "No CMDB is configured for your organization."

## How to get to it (user POV)
Connected view of `/config`: the bar above the tech stack.

## Driving it with Playwright
`node drive.mjs sync-edit-disconnect` (customer_admin) and `node drive.mjs viewer-readonly` (connects as admin, signs out, checks the viewer). Dialog: `getByRole('dialog', { name: 'Edit iTop connection' })`, button "Save changes". Disconnect: "Disconnect", then "Yes, disconnect".

Unreachable here: the sync failure path. The MSW sync handler (`src/test/mocks/handlers/cmdb.ts`) always succeeds and has no failure switch, so "Update credentials" needs a real backend whose iTop rejects the credentials (or a failure toggle added to that handler, which is product test code).

## Gotchas
- Sync and Disconnect are disabled while a sync is in flight.
- Disconnect keeps assets (marked inactive) in the real backend; the mock does not model that, so do not assert on it.
- End state: `apiCalls` holds one `POST /cmdb/source/sync`, a `PUT /cmdb/source` with the new user, one `DELETE /cmdb/source`, and the selector heading is visible.
