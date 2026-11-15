# Asset triage: Exposure and Information Classification

## Sub-features
- Banner above the asset list: "N Assets need triage." (an Active asset with an Unknown Exposure or no Information Classification, counted across the whole inventory from two reads: `active=true&exposure=unknown` and `active=true&information_classification=unclassified`, merged by id) with "Triage them" (customer_admin only); "Every Active Asset is triaged." when none
- Queue sheet "Triage Assets": "i of N" with a progress bar, one asset per step, "Next", then a summary "X of N Assets triaged" and "Done"; a step with an unsaved choice says which sections were not saved
- Single sheet "Triage Asset": opened from the record's Exposure or Information Classification button
- Exposure section: provenance rows "Declared" and "From iTop" (the one in use marked "In use"), radios "Internet-facing" / "Internal" (Internal shows a warning that it lowers the Score), "Declare Exposure", and "Use iTop's (value)" or "Clear" when iTop has none
- Information Classification section: radios Public / Private / Confidential, "Declare Classification", "Clear"; unclassified is not scored
- Each save shows "Saved" in its section; a failed rescore after an Exposure change shows a warning toast
- Viewer: the same sheet, no radios or buttons, "Only a Customer Admin can declare an Exposure or an Information Classification."; an Inactive asset can't be declared either

## How to get to it (user POV)
Connected view of `/config`, Tech stack tab: "Triage them" in the banner, or the Exposure / Information Classification buttons in an asset's record.

## Driving it with Playwright
`node drive.mjs triage`: checks the two triage reads, queue declares Internal on `analytics-worker-03` (1 of 5), skips to `prod-api-01` (5 of 5) and declares Confidential, summary "2 of 5"; banner goes 5 → 4; the single sheet clears `analytics-worker-03`'s Exposure; a viewer opens `prod-api-01`'s sheet read-only. Sections are regions named "Exposure" and "Information Classification"; radios by label (`/^Internal/`).

Not covered: the inactive-asset lock, the "turned Inactive" 409, the not-rescored toast (the mock never fails a rescore).

## Gotchas
- Queue order is the assets with an Unknown Exposure, then the other Unclassified ones, each in inventory order, as they were when the queue opened; answering one does not reshuffle it.
- End state: `PUT /assets/1/information-classification` with `confidential`, `PUT /assets/2/exposure` with `internal`, one `DELETE /assets/2/exposure`, and "4 Assets need triage."
