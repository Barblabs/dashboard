# Mobile layout

## Sub-features
- Below 768px the sidebar column is hidden; a top bar holds the Menu button, the logo and the wordmark
- Menu opens a drawer from the left with the role's links, the "Super Admin" tag, the language switcher, the user card, Sign out and the footer
- The drawer closes on choosing a link, on Escape and on tapping the backdrop; focus returns to Menu, whose `aria-expanded` follows the drawer
- `<main>` fills the full viewport width on every page
- At 768px and wider the fixed sidebar is back and the top bar is gone
- Below 768px text inputs, textareas, selects, the search field, multi-selects and tag fields render at 16px, so iOS does not zoom on focus; from 768px they are 15px (selects 14px)
- Below 768px the Finding detail fills the screen edge to edge; its signals sit in a compact grid so "Why it is here" shows on the first screen
- A tab list that overflows fades at its clipped edge (`data-overflow-start` / `data-overflow-end`)
- The Fab (Users, Tenants) clears the safe-area insets, and its page leaves room so the last row scrolls above it

## How to get to it (user POV)
Any signed-in page on a phone-sized screen.

## Driving it with Playwright
`node drive.mjs mobile`: 390x844 viewport, customer_admin through every page from the drawer, Escape and backdrop close, 404, platform_admin drawer and pages, then back to 1280x900.
`node drive.mjs phone`: input font sizes on the iTop form, the Import dialog and every Business context tab, Users, Tenants; the Finding detail box and corner radius; the Findings tab fade; Users and Tenants grown through the UI (invites, new organizations) until `main` scrolls, then the last row against the Fab. All again on a fresh 1280x900 context, expecting today's desktop look.

## Gotchas
- Base UI's combobox keeps a visually hidden 16px input on every breakpoint; the font check skips fields under 3px wide or inside `aria-hidden`.
- While the drawer is open the rest of the page is `aria-hidden`, so the Menu locator uses `includeHidden: true`, and `main` is only found once the drawer has finished closing.
