# News

## Sub-features
- `/news` (customer_admin and viewer), heading "News": the Customer's News Digests, news about attacks and vulnerabilities that rules found relevant to it
- Header: "News from <period>", a badge per Relevance with its count (Name you, Open vulnerabilities, Technology and suppliers, Your sector), "Weighed with business context vN"; a "Digest" select lists earlier digests by period and size; the digest being read is in the URL (`?digest=<id>`), the newest takes none
- One region per Relevance, closest first: "They name you", "They mention vulnerabilities open on your assets", "They mention technology or suppliers you use", "Attacks in your sector" with "Context: it does not mean you are exposed."
- Each item: "Leak-site post" badge, the title linking to the source (new tab), "Source: <feed name> · <date>" ("Source: Ransomware.live" links to https://www.ransomware.live, as its terms require), the backend's labels as written, "Why it may matter to you" with the Business Context evidence, the summary or "Original text", "Why it appears", "Attacks the source reports", CVE chips
- "The summary couldn't be written; ..." once at the top when the Editor did not verify the digest; a hint linking to the business context when it states no sector; "No news yet" with what makes news arrive before the first digest

## How to get to it (user POV)
Sidebar link "News".

## Driving it with Playwright
`node drive.mjs news`: as a viewer, the four groups in order, two Ransomware.live credits, pick the earlier digest (Editor note, URL), reload, switch to ES and pick the newest again.

Unreachable here: the empty state and the no-sectors hint (the mock always has two digests with sectors; vitest covers both by changing the store).

## Gotchas
- Fixtures `src/mocks/news-digests-store.ts`: the newest digest has every Relevance and a verified Editor; the older one has footprint and peer items and a failed Editor, so no item has a why. Labels, reasons, summaries and whys are Spanish whatever the UI language. Mock state: localStorage `barbattack_mock_news_digests`.
- Item titles are links whose name ends in "(opens in a new tab)": match them by regex.
- End state: `GET /news-digests?limit=30` and a `GET /news-digests/<id>` per digest opened.
