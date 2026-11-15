# Connect a CMDB

## Sub-features
- `/config` has two page tabs, "CMDB" (default) and "Slack" (see slack.md)
- With no source: a "Connect CMDB" step panel (choose, credentials, connect; "No connection") beside the provider selector "Choose your CMDB" (iTop available; ServiceNow and "Other CMDB" show "Coming soon")
- Credentials form "Connect iTop" with blur validation (address must start with http:// or https://, user and password required), "← Change CMDB" back to the selector
- Test connection (success status, or translated error alert)
- Connect and sync (stores the source, switches to the connected view)

## How to get to it (user POV)
Sign in as customer_admin; `/config` with no CMDB connected shows "Choose your CMDB". Click "Select" on iTop, fill the form. A viewer gets only "No CMDB is configured for your organization." (see manage-connection.md); platform_admin gets "Access denied".

## Driving it with Playwright
`node drive.mjs connect`. Roles/labels: button "Select", labels "iTop address (IP or URL)", "User", "Password", buttons "Test connection" and "Connect and sync", `status` role for success, `alert` role for errors. User `admin` triggers the `missing_rest_profile` error with the user name interpolated. Not covered by the script: client-side validation messages (blur an empty field), the "← Change CMDB" link.

## Gotchas
- A connect while a source exists returns 409 `already_connected`; a fresh browser context starts with no source.
- The password field is never persisted; after a reload the form is empty.
- The source is stored (mock: localStorage `barbattack_cmdb_source`), so a reload stays connected.
- End state: "iTop connected" badge, the "Tech stack" asset list visible, the `POST /cmdb/source` call in `apiCalls` has the typed url/user, and it is still connected after a reload.
