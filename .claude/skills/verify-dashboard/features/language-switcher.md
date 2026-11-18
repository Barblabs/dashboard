# Language switcher

## Sub-features
- EN / ES buttons (group "Language" / "Idioma") at the bottom of the sidebar, `aria-pressed` marks the active one
- Choice stored in `localStorage` key `language`; otherwise the browser language decides (`es-*` is Spanish)
- Pages without the sidebar (login, deactivated) have no switcher but follow the stored or detected language

## How to get to it (user POV)
Sidebar footer, on any signed-in page.

## Driving it with Playwright
`node drive.mjs language`. To test browser detection instead, create the context with `locale: 'es-MX'` and no stored choice.

## Gotchas
- The driver pins `en-US`, so every other scenario assumes English text.
- In Spanish the sidebar's sign out is "Cerrar sesión" and the mock role buttons are translated ("Administrador (customer_admin)", "Lector (viewer)").
- Text written by the agents and the mock fixtures (group reasons, plans, drafts) stays in Spanish in both languages.
- End state: heading "Configuración" visible, `localStorage.language === 'es'`, still Spanish with ES pressed after a reload, and the sign-in page in Spanish after signing out.
