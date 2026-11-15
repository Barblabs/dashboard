# Findings

## Sub-features
- `/findings` (customer_admin and viewer), heading "Findings": the current order of open Findings, kept by the Prioritizer
- Summary line: "Updated <date> · N findings, M groups · Weighed with business context vN" (or "without a business context"); "No findings yet. ..." when there is no prioritization
- One panel per group: "Group N" badge, the group title and reason (written by the Prioritizer), a table CVE / Asset / Component / Score (0-100 plus a band badge Critical/High/Medium/Low) / By Score (#rank) / Status badges (Closed, KEV, Ransomware, New, Plan)
- Clicking a row or "Open <CVE>" opens the detail modal; the open finding is in the URL (`?finding=<id>`), so a reload or a link lands on it
- Detail sections: Why it is here (group reason, evidence), Score (band, factors CVSS/EPSS/KEV/multipliers/Exploit signal, "Measured" or "Estimated" with gap badges), Vulnerability (KEV, EPSS, CVSS, references), Asset (current Criticality, Exposure, Lifecycle Stage, Information Classification, critical services), How it would be attacked, Vendor advisories, Action plan, Feedback
- Action plan: "Ask Luna for an action plan" / "Ask for a new plan", "Luna is writing the plan. It can take a minute…", then summary, steps, fixed version, mitigation, MITRE mitigations, verification, sources
- Feedback: list of verdicts, form "What do you say?" (It applies, It does not apply, Already remediated, Should be attended earlier/later) and "Why", "Send", "Saved."

## How to get to it (user POV)
Sidebar link "Findings".

## Driving it with Playwright
`node drive.mjs findings`: summary and the three groups, open CVE-2021-41773, reload, ask Luna (the mock answers after about 2.5 s), send "Should be attended earlier" with a note, close. The modal is `getByRole('dialog')`.

Unreachable here: the empty state (the mock always has two prioritizations; it needs a backend with none), plan errors (refused, rejected, unavailable).

## Gotchas
- Fixtures `src/mocks/prioritizations-store.ts`: 5 findings in 3 groups; group texts and Luna's plan are in Spanish whatever the UI language. CVE-2024-6387 is "New"; CVE-2024-23897 already has a plan. Mock state: localStorage `barbattack_mock_prioritizations`.
- Findings do not depend on a CMDB connection in mock mode.
- End state: one `POST /prioritizations/<id>/plans`, one `POST .../feedback` with verdict `should_be_earlier`, and the plan shown in the modal.
