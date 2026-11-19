# Findings

## Sub-features
- `/findings` (customer_admin and viewer), heading "Findings": indicator cards (Open, Critical, High, In KEV, Critical on internet-facing) over five tabs, "Prioritized list" first, then Summary, Before & After, Where the risk is, Threats (tab kept in `?tab=`)
- Prioritized list: the current order of open Findings, kept by the Prioritizer, under a filter bar (search, Band, Exposure, Status, KEV only; filters live in the URL, with chips and "Clear all")
- Summary line: "Updated <date> · N findings, M groups · Weighed with business context vN" (or "without a business context"); "No findings yet. ..." replaces the list when there is no prioritization
- One panel per group: "Group N" badge, the group title and reason (written by the Prioritizer), a table (cards below 768px, see phone-cards.md) CVE / Asset / Component / Score (0-100 plus a band badge Critical/High/Medium/Low) / By Score (#rank) / Status badges (Closed, KEV, Ransomware, New, Plan)
- Clicking a row or "Open <CVE>" opens the detail modal; the open finding is in the URL (`?finding=<id>`), so a reload or a link lands on it
- Detail sections, in order, with an "On this finding" rail: Why it is here (group reason, evidence), Action plan, How it would be attacked, Vulnerability (KEV, EPSS, CVSS), Asset (current Criticality, Exposure, Lifecycle Stage, Information Classification, critical services), Score (band, factors CVSS/EPSS/KEV/multipliers/Exploit signal, "Measured" or "Estimated" with gap badges), Vendor advisories, References (only when there are any), Feedback
- Action plan: "Ask Luna for an action plan" / "Ask for a new plan", "Luna is writing the plan. It can take a minute…", then "Written by Luna <date>", summary, "Steps", "Version that fixes it", "Until it is fixed", "MITRE mitigations for this asset", "How to verify", "Sources"
- Feedback: list of verdicts, form "What do you say?" (It applies, It does not apply, Already remediated, Should be attended earlier/later) and "Why", "Send", "Saved."

## How to get to it (user POV)
Sidebar link "Findings".

## Driving it with Playwright
`node drive.mjs findings`: summary ("20 findings, 4 groups") and the four groups, open CVE-2021-41773, reload, ask Luna (the mock answers after about 2.5 s), send "Should be attended earlier" with a note, close. The modal is `getByRole('dialog')`; inside it, "Why" also matches the "Why it is here" section, so the note is `getByRole('textbox', { name: 'Why', exact: true })`.

Unreachable here: the empty state (the mock always has two prioritizations; it needs a backend with none), plan errors (refused, rejected, unavailable), the "Closed" badge (no closed Finding in the fixtures).

## Gotchas
- Fixtures `src/mocks/prioritizations-store.ts`: the newest prioritization has 20 findings in 4 groups (4, 5, 6, 5), the older one 19; group texts and Luna's plan are in Spanish whatever the UI language. CVE-2024-6387 is "New"; CVE-2024-23897 already has a plan. Mock state: localStorage `barbattack_mock_prioritizations`.
- Findings do not depend on a CMDB connection in mock mode.
- End state: one `POST /prioritizations/<id>/plans`, one `POST .../feedback` with verdict `should_be_earlier`, and the plan shown in the modal.
