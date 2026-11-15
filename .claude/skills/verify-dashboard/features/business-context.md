# Business context

## Sub-features
- `/business-context` (customer_admin and viewer), heading "Business context"
- Nothing saved yet: admin sees "Start with your documents" with "Import documents" and "Fill it in by hand"; viewer sees "Your organization has not stated its business context yet."
- Form in five tabs ("Profile", "Location", "Operations", "Digital footprint", "Risk"; tab names include the step number, so match with a regex), "← Previous" / "Next →"
- Field kinds: text, multi-selects (combobox, placeholder "Choose…", options by role, chips with "Remove {label}"), tag fields (Enter or comma adds), critical services rows ("+ Add critical service")
- Domains are cleaned: lowercased, scheme, path, `www.` and trailing dot removed
- Import dialog "Import documents": hidden file input labelled "Files" (`.pdf,.docx,.txt,.md,.markdown,.csv,.json`), "Or paste text", "Generate draft"; the draft fills the form and a status says "N fields were filled from your documents. Review them and save."
- Save: "Save" (disabled until a change), status "✓ Saved"; a stale version shows an alert with "Load the newest version"
- Viewer: values as plain text (lists comma-separated, an em dash placeholder when empty), no Save or Import

## How to get to it (user POV)
Sidebar link "Business context".

## Driving it with Playwright
`node drive.mjs business-context`: import a `.txt` with `setInputFiles` on `getByLabel('Files')`, wait for the draft (the mock answers after about 2.5 s), add `https://www.Example.COM/path` to "Domains", save, then check the viewer sees `example.com` without controls.

## Gotchas
- The mock ignores the file content and always returns the same Spanish draft.
- Mock state: localStorage `barbattack_mock_business_context`; on save the mock bumps the version.
- End state: status "✓ Saved", the last `PUT /business-context` body contains `"example.com"`, the viewer sees it on "Digital footprint".
