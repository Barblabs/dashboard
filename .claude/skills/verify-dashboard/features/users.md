# Users

## Sub-features
- `/users`, customer_admin only (viewer has no link and gets "Access denied")
- Table (Email, Role badge "Admin"/"Viewer", "Invitation pending" until the invitation email goes out), search by email, counter ("3 users", "4 users · 1 disabled")
- "Invite user" floating button and dialog: label "Email", Role select (default Viewer), "Send invitation"; a toast "Invitation sent to <email>." (or a warning when the email is still pending); duplicate email shows "A user with this email already exists."
- "Edit role" dialog "Change role" with Save/Cancel
- "Disable" with confirmation dialog "Disable user" / "Yes, disable"; disabled rows are dimmed with a "Disabled" badge and no actions. There is no Enable action
- Demoting or disabling the last active admin is refused: "Cannot remove the last admin of your organization."

## How to get to it (user POV)
Sidebar link "Users".

## Driving it with Playwright
`node drive.mjs users`: invite an admin, disable the fixture admin, then try to demote the new one. The Role select is native; reach it with `dialog.getByRole('combobox')` and `selectOption({ label })`.

## Gotchas
- Fixtures: `admin@acme.example` (Admin), `viewer@acme.example` (Viewer), and a long pending viewer email at `northwind-industries-holdings.example.com`. Mock state: localStorage `barbattack_mock_users`.
- The mock signed-in user (`admin@barbattack.example`) is not in the list, so the "You" marker never shows in mock mode.
- End state: "4 users · 1 disabled", the refusal alert in the open dialog, and `POST /users` with the invited email in `apiCalls`.
