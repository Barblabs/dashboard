# Findings

## Sub-features
- `/findings` (customer_admin and viewer), heading "Findings": indicator cards (Open, Critical, High, In KEV, Critical on internet-facing) over six tabs, "Prioritized list" first, then Closed, Summary, Before & After, Where the risk is, Threats (tab kept in `?tab=`)
- Prioritized list: the current order of open Findings, kept by the Prioritizer, under a filter bar (search, Band, Exposure, Status, KEV only; filters live in the URL, with chips and "Clear all")
- Summary line: "Updated <date> · N findings, M groups · Weighed with business context vN" (or "without a business context"); "No findings yet. ..." replaces the list when there is no prioritization
- One panel per group: "Group N" badge, the group title and reason (written by the Prioritizer), a table (cards below 768px, see phone-cards.md) CVE / Asset / Component / Score (0-100 plus a band badge Critical/High/Medium/Low) / By Score (#rank) / Status badges (Closed, KEV, Ransomware, New, Plan)
- Clicking a row or "Open <CVE>" opens the detail modal; the open finding is in the URL (`?finding=<id>`), so a reload or a link lands on it
- Detail: a rail (CVE, component, asset, Score, rank, badges, CISA KEV, EPSS, CVSS, Exposure, Criticality, Lifecycle Stage, Information Classification, placed date) beside a column that reads Why it is here (the group reason, cited values marked), the "Is it in the right place?" box, Action plan, then folded sections that unfold on a click: How it would be attacked, Vulnerability (description, "CVSS <version> vector" of the highest CVSS, CISA's "Required action" unless the plan's "Until it is fixed" says it), Asset (every attribute, component and role, critical services), Score (factors and multipliers; "Estimated" with gap badges only when inputs were missing), Vendor advisories, References (only those the plan does not cite, and only when there are any). Nothing in the column repeats another part of it; the rail is the summary
- No visible text names an agent (Luna, the Prioritizer, the Cartógrafo, the Editor, the Analista), says something was inferred, or shows the Scoring Model
- Action plan: "Get an action plan" / "Ask for a new plan", "Writing the plan. It can take a minute…", then "Written <date>", summary, "Steps", "Version that fixes it" (narrow) beside "How to verify" (wide), "Until it is fixed", "MITRE mitigations for this asset", "Sources"
- "Is it in the right place?": three verdict buttons (✓ It applies, ↑ Should be attended earlier, ↓ Should be attended later, `aria-pressed` on the chosen one); choosing one shows a required "Why" with a "N / 2000" count and "Send" (disabled while Why is blank), then "Saved."; below, "What was said (N)" lists the verdicts (older ones may say "It does not apply" or "Already remediated")
- Close by hand (ADR 0035, Customer Admin and Viewer): "Close finding", filled, alone in the detail's top bar (a divider sets it apart from the ✕ "Close" of the modal; offered nowhere else) opens "Close <CVE>": a Reason radio group (Already remediated, False positive / does not apply, Accepted risk, Postponed), each with what happens next; "Reopens after" with "In 30 days" / "In 90 days" only for Accepted risk and Postponed; a required Why. Once closed: "Closed" badge and a dimmed row in the list, Open count down by one, the detail's rail shows the reason, the note, "Closed by <email> on <date>" and "Reopens after <date>", and the top bar offers "Reopen" (confirm "Reopen <CVE>?", "Yes, reopen"). A Finding closed on its own says "This finding closed automatically; ..." and offers neither
- Closed tab (`?tab=closed`): the Findings closed by hand, newest first: CVE, Asset · Component, Reason badge, Why, Closed (who, when), Reopens on (a date, or "Will reopen at the next sync" once it passed), "Reopen <CVE>" per row; "No findings closed by hand" when empty; cards below 768px

## How to get to it (user POV)
Sidebar link "Findings".

## Driving it with Playwright
`node drive.mjs finding-closes`: as a Viewer, the three verdict buttons, no Why until one is chosen and then a disabled Send, a single "Close finding" in the top bar, Postponed in 30 days with a Why, the detail turns to Reopen with the close in its rail, the row shows Closed and Open goes 23 → 22, the Closed tab lists it with Reopen inside the table's edge, reopen from the row, empty state. Checks the close body (`reason`, `note`, `reopen_at` as a start of day with its offset), one reopen, and the summary fetched again.

`node drive.mjs findings`: summary ("20 findings, 4 groups") and the four groups, open CVE-2021-41773, reload, get an action plan (the mock answers after about 2.5 s), unfold Vulnerability, check the detail names no agent, inference or Scoring Model, send "Should be attended earlier" with a note, close. The modal is `getByRole('dialog')`; inside it, "Why" also matches the "Why it is here" section, so the note is `getByRole('textbox', { name: 'Why', exact: true })`.

Unreachable here: the empty state (the mock always has two prioritizations; it needs a backend with none), plan errors (refused, rejected, unavailable), a Finding closed on its own (none in the fixtures; the unit tests cover it), the 409s (`finding_closed`, `finding_not_closed_by_hand`).

## Gotchas
- Fixtures `src/mocks/prioritizations-store.ts`: the newest prioritization has 20 findings in 4 groups (4, 5, 6, 5), the older one 19; group texts and Luna's plan are in Spanish whatever the UI language. CVE-2024-6387 is "New"; CVE-2024-23897 already has a plan. Mock state: localStorage `barbattack_mock_prioritizations`.
- Findings do not depend on a CMDB connection in mock mode.
- Closed by hand: localStorage `barbattack_mock_closed_findings` (empty in the fixtures). The mock's Open count is 23 minus the Findings closed by hand.
- The modal's own close button is the ✕ named "Close": match it with `exact: true`, or "Close finding" matches too.
- End state: one `POST /prioritizations/<id>/plans`, one `POST .../feedback` with verdict `should_be_earlier`, and the plan shown in the modal.
