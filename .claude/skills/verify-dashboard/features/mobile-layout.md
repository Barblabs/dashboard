# Mobile layout

## Sub-features
- Below 768px the sidebar column is hidden; a top bar holds the Menu button, the logo and the wordmark
- Menu opens a drawer from the left with the role's links, the "Super Admin" tag, the language switcher, the user card, Sign out and the footer
- The drawer closes on choosing a link, on Escape and on tapping the backdrop; focus returns to Menu, whose `aria-expanded` follows the drawer
- `<main>` fills the full viewport width on every page
- At 768px and wider the fixed sidebar is back and the top bar is gone

## How to get to it (user POV)
Any signed-in page on a phone-sized screen.

## Driving it with Playwright
`node drive.mjs mobile`: 390x844 viewport, customer_admin through every page from the drawer, Escape and backdrop close, 404, platform_admin drawer and pages, then back to 1280x900.

## Gotchas
- While the drawer is open the rest of the page is `aria-hidden`, so the Menu locator uses `includeHidden: true`, and `main` is only found once the drawer has finished closing.
