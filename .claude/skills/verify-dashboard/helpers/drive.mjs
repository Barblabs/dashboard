// Drives the running dashboard (mock mode) like a user and saves screenshots + a JSON report.
// Usage: node drive.mjs <scenario> [--headed]
// Each scenario starts from a fresh browser context (empty localStorage = fresh mock data); run launch.sh first.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const verifyHome = (process.env.VERIFY_HOME ?? path.join(process.env.TMPDIR ?? '/tmp', 'verify-dashboard')).replace(/\/$/, '')
const chromium = await loadChromium()
const FRONT = `http://localhost:${process.env.FRONT_PORT ?? 15173}`
const API = `http://localhost:${process.env.MOCK_API_PORT ?? 18080}`
const scenarioName = process.argv[2]
const headed = process.argv.includes('--headed')

async function loadChromium() {
  const require = createRequire(path.join(verifyHome, 'tools', 'package.json'))
  return require('playwright-core').chromium
}

// playwright-core ships no assertion lib; a tiny poll-based one is enough here.
function expect(locator) {
  return {
    toBeVisible: (timeout = 5000) => locator.waitFor({ state: 'visible', timeout }),
    toBeHidden: (timeout = 5000) => locator.waitFor({ state: 'hidden', timeout }),
  }
}

const evidenceDir = path.join(process.env.EVIDENCE_DIR ?? path.join(verifyHome, 'evidence'), `${scenarioName}-${new Date().toISOString().replace(/[:.]/g, '-')}`)
mkdirSync(evidenceDir, { recursive: true })
const steps = []
const consoleErrors = []
const apiCalls = []
const externalRequests = []
let context
let page

// <main> is the scroll container, so a full-page screenshot only shows the viewport anyway.
// Pass a locator to scroll the part that matters into view first.
async function shot(label, focus) {
  if (focus) await focus.scrollIntoViewIfNeeded()
  // Dialogs and sheets fade and slide in; a shot taken mid-transition shows them half there.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity))
  const file = `${String(steps.length + 1).padStart(2, '0')}-${label}.png`
  await page.screenshot({ path: path.join(evidenceDir, file) })
  steps.push({ label, screenshot: file, url: page.url() })
}

function check(condition, message) {
  if (!condition) throw new Error(message)
}

const callsTo = (method, pathPrefix) => apiCalls.filter((c) => c.method === method && c.path.startsWith(pathPrefix))

// In mock mode /login is a role picker; the picked role is kept in localStorage, so the session
// survives reloads and page.goto until signOut().
const ROLE_BUTTON = {
  platform_admin: 'Super Admin (platform_admin)',
  customer_admin: 'Admin (customer_admin)',
  viewer: 'Viewer (viewer)',
}
const HOME = { platform_admin: '/tenants', customer_admin: '/dashboard', viewer: '/dashboard' }

// Signing in returns to the page the guard sent the visitor away from, if any; pass `landing`
// when that is not the role's home.
async function signIn(role, landing = HOME[role]) {
  if (!page.url().endsWith('/login')) await page.goto(`${FRONT}/login`)
  await page.getByRole('button', { name: ROLE_BUTTON[role] }).click()
  await page.waitForURL(`**${landing}`)
}
// Signing in again after this returns to the page signed out from if the new role can open it; pass
// `{ fresh: true }` to open / so the next sign-in lands on its role's home (reopening /login keeps it).
async function signOut({ fresh = false } = {}) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('**/login')
  if (fresh) await openSignInFromLanding()
}
async function openSignInFromLanding() {
  await goto('/')
  await page.getByRole('link', { name: 'Sign in' }).first().click()
  await page.waitForURL('**/login')
}
const goto = async (pathname) => page.goto(`${FRONT}${pathname}`)
const sidebarLink = (name) => page.getByRole('navigation').getByRole('link', { name, exact: true })
const tab = (name) => page.getByRole('tab', { name, exact: true })

/*
 * Mock backend state that no UI path can create in mock mode (a finished Slack OAuth). Written to
 * the mock's localStorage store and picked up by a reload. Never use it to skip a step under test.
 */
async function seedMockBackend(key, value) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [key, value])
  await page.reload()
}

const ITOP = { url: 'http://10.0.0.5:8000', user: 'barb-reader', password: 'not-a-real-secret' }

async function fillItop(login = ITOP) {
  await page.getByLabel('iTop address (IP or URL)').fill(login.url)
  await page.getByLabel('User', { exact: true }).fill(login.user)
  await page.getByLabel('Password', { exact: true }).fill(login.password)
}

// The tech stack is a listbox of Assets beside the selected Asset's record.
const assetList = () => page.getByRole('listbox', { name: 'Tech stack' })
const assetOption = (name) => assetList().getByRole('option').filter({ hasText: name })
const assetRecord = (name) => page.getByRole('article', { name })

async function connect() {
  await expect(page.getByRole('heading', { name: 'Choose your CMDB' })).toBeVisible()
  await page.getByRole('button', { name: 'Select' }).click()
  await fillItop()
  await page.getByRole('button', { name: 'Test connection' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Connection successful' })).toBeVisible()
  await page.getByRole('button', { name: 'Connect and sync' }).click()
  await expect(page.getByText('iTop connected')).toBeVisible()
  await expect(assetList()).toBeVisible()
}

async function checkNoSidewaysScroll(label) {
  const { scrollWidth, clientWidth } = await page.getByRole('main').evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
  steps.push({ label: `${label} main width`, scrollWidth, clientWidth })
  check(scrollWidth === clientWidth, `${label}: main scrolls sideways (${scrollWidth} > ${clientWidth})`)
}

async function checkOnScreen(name, locator, width) {
  const box = await locator.boundingBox()
  check(box && box.x >= 0 && box.x + box.width <= width, `${name} not fully on screen: ${JSON.stringify(box)}`)
  return box
}

const scenarios = {
  async mobile() {
    await page.setViewportSize({ width: 390, height: 844 })
    const menu = page.getByRole('button', { name: 'Menu', includeHidden: true })
    const drawer = page.getByRole('dialog')
    const drawerLink = (name) => drawer.getByRole('link', { name, exact: true })
    async function checkMainFillsWidth(label) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const box = await page.getByRole('main').boundingBox()
      steps.push({ label: `${label} main box`, box })
      check(box && box.x === 0 && box.width === 390, `${label}: main is ${JSON.stringify(box)}, expected x 0 and width 390`)
    }

    await signIn('customer_admin')
    check(!(await page.getByRole('complementary').isVisible()), 'sidebar column visible at 390px')
    await checkMainFillsWidth('/config')
    await shot('top-bar')

    await menu.click()
    await expect(drawer).toBeVisible()
    check((await menu.getAttribute('aria-expanded')) === 'true', 'menu not aria-expanded while open')
    for (const text of ['Findings', 'Sign out', 'admin@barbattack.example', 'Admin']) {
      await expect(drawer.getByText(text, { exact: true }).first()).toBeVisible()
    }
    await expect(drawer.getByRole('group', { name: 'Language' })).toBeVisible()
    await shot('drawer-open')

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    check(await menu.evaluate((el) => el === document.activeElement), 'focus not back on menu after Escape')
    check((await menu.getAttribute('aria-expanded')) === 'false', 'menu still aria-expanded after Escape')

    await menu.click()
    await expect(drawer).toBeVisible()
    await page.mouse.click(380, 400)
    await expect(drawer).toBeHidden()
    check(await menu.evaluate((el) => el === document.activeElement), 'focus not back on menu after backdrop tap')

    for (const [name, pathname] of [['Findings', '/findings'], ['News', '/news'], ['Business context', '/business-context'], ['Users', '/users'], ['Configuration', '/config']]) {
      await menu.click()
      await drawerLink(name).click()
      await page.waitForURL(`**${pathname}`)
      await expect(drawer).toBeHidden()
      check(await menu.evaluate((el) => el === document.activeElement), `focus not back on menu after choosing ${name}`)
      await checkMainFillsWidth(pathname)
      await shot(pathname.slice(1))
    }
    await goto('/no-such-page')
    await checkMainFillsWidth('404')
    await shot('not-found')

    await menu.click()
    await drawer.getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL('**/login')
    await openSignInFromLanding()
    await signIn('platform_admin')
    await menu.click()
    await expect(drawer.getByText('Super Admin', { exact: true }).first()).toBeVisible()
    await shot('super-admin-drawer')
    for (const [name, pathname] of [['Dashboard', '/admin-dashboard'], ['Organizations', '/tenants']]) {
      if (pathname === '/tenants') await menu.click()
      await drawerLink(name).click()
      await page.waitForURL(`**${pathname}`)
      await expect(drawer).toBeHidden()
      await checkMainFillsWidth(pathname)
      await shot(pathname.slice(1))
    }

    await page.setViewportSize({ width: 1280, height: 900 })
    check(await page.getByRole('complementary').isVisible(), 'sidebar column hidden at 1280px')
    check(!(await menu.isVisible()), 'menu button visible at 1280px')
    await shot('desktop-unchanged')
  },
  async 'phone-stacking'() {
    await page.setViewportSize({ width: 390, height: 844 })
    const main = page.getByRole('main')
    await signIn('customer_admin')
    await expect(page.getByRole('heading', { name: 'Choose your CMDB' })).toBeVisible()
    const stepsTitle = await page.getByRole('heading', { name: 'Connect CMDB' }).boundingBox()
    const choice = await page.getByRole('heading', { name: 'Choose your CMDB' }).boundingBox()
    check(choice.y > stepsTitle.y + stepsTitle.height && Math.abs(choice.x - stepsTitle.x) < 30, `the steps panel is not stacked above the CMDB choice: ${JSON.stringify({ stepsTitle, choice })}`)
    await checkNoSidewaysScroll('config choose')
    await shot('config-choose-stacked')
    await checkOnScreen('Select', page.getByRole('button', { name: 'Select' }), 390)
    await shot('config-choose-select', page.getByRole('button', { name: 'Select' }))

    await page.getByRole('button', { name: 'Select' }).click()
    await expect(page.getByLabel('iTop address (IP or URL)')).toBeVisible()
    await checkNoSidewaysScroll('config itop form')
    await shot('itop-form', page.getByLabel('iTop address (IP or URL)'))
    await page.reload()
    await connect()

    await checkNoSidewaysScroll('config connected')
    for (const name of ['Disconnect', 'Edit connection', 'Sync now']) await checkOnScreen(name, page.getByRole('button', { name }), 390)
    const sync = page.getByRole('button', { name: 'Sync now' })
    await shot('connected-bar', page.getByText('iTop connected'))
    const syncsBefore = callsTo('POST', '/cmdb/source/sync').length
    await sync.click()
    await expect(page.getByText('Sync complete.')).toBeVisible()
    check(callsTo('POST', '/cmdb/source/sync').length === syncsBefore + 1, 'Sync now on a phone did not POST /cmdb/source/sync')

    const triage = page.getByRole('button', { name: 'Triage them' })
    const triageText = await page.getByText(/Assets? needs? triage\./).boundingBox()
    const triageBox = await checkOnScreen('Triage them', triage, 390)
    check(triageText && triageBox.y >= triageText.y + triageText.height, `Triage them is not under the banner text: ${JSON.stringify({ triageText, triageBox })}`)
    await shot('triage-banner', triage)

    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL('**/login')
    await openSignInFromLanding()
    await signIn('platform_admin')
    const search = page.getByRole('searchbox', { name: 'Search by name…' })
    const counter = page.getByText('3 organizations, 1 deactivated')
    await expect(counter).toBeVisible()
    await checkNoSidewaysScroll('/tenants')
    const mainBox = await main.boundingBox()
    const searchBox = await search.boundingBox()
    const counterBox = await counter.boundingBox()
    // main has 16px side padding on phones.
    check(searchBox && Math.abs(searchBox.width - (mainBox.width - 32)) <= 1, `search is not full width: ${searchBox?.width} of ${mainBox.width}`)
    check(counterBox && counterBox.y >= searchBox.y + searchBox.height, 'the organizations count is not on its own line under the search')
    await shot('tenants-toolbar')

    await page.setViewportSize({ width: 1280, height: 900 })
    const wideSearch = await search.boundingBox()
    const wideCounter = await counter.boundingBox()
    check(wideCounter.y < wideSearch.y + wideSearch.height && wideCounter.x > wideSearch.x + wideSearch.width, 'at 1280px the count is not beside the search')
    await shot('tenants-desktop')
  },
  async 'phone-cards'() {
    await page.setViewportSize({ width: 390, height: 844 })
    const main = page.getByRole('main')
    const card = (text) => main.getByRole('listitem').filter({ hasText: text })

    await signIn('customer_admin')
    await goto('/findings')
    const firstGroup = page.getByRole('region').first()
    await expect(firstGroup.getByRole('button', { name: 'Open CVE-2021-41773' })).toBeVisible()
    check((await main.getByRole('table').count()) === 0, 'findings: a table is rendered at 390px')
    await checkNoSidewaysScroll('/findings')
    await shot('findings-cards', firstGroup)
    const findingCard = card('CVE-2021-41773')
    await findingCard.getByText('By Score').click()
    await expect(page.getByRole('dialog', { name: 'CVE-2021-41773' })).toBeVisible()
    check(page.url().includes('finding='), 'tapping a finding card did not put the finding in the URL')
    await shot('finding-opened-from-card')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'CVE-2021-41773' })).toBeHidden()

    await goto('/users')
    await expect(page.getByText('3 users')).toBeVisible()
    check((await main.getByRole('table').count()) === 0, 'users: a table is rendered at 390px')
    await checkNoSidewaysScroll('/users')
    await shot('users-cards')
    const viewerCard = card('viewer@acme.example')
    const disable = viewerCard.getByRole('button', { name: 'Disable' })
    const box = await disable.boundingBox()
    check(box && box.x >= 0 && box.x + box.width <= 390, `disable button not fully on screen: ${JSON.stringify(box)}`)
    await disable.click()
    await page.getByRole('dialog', { name: 'Disable user' }).getByRole('button', { name: 'Yes, disable' }).click()
    await expect(viewerCard.getByText('Disabled')).toBeVisible()
    check(callsTo('POST', '/users/').some((c) => c.path.endsWith('/disable') && c.status === 200), 'no successful POST /users/:id/disable')
    await shot('user-disabled-from-card')

    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL('**/login')
    await openSignInFromLanding()
    await signIn('platform_admin')
    await goto('/admin-dashboard')
    const orgs = page.getByRole('heading', { name: 'Organizations', level: 2, exact: true })
    await expect(orgs).toBeVisible()
    await expect(page.getByText(/^Failed on /).first()).toBeVisible()
    check((await main.getByRole('table').count()) === 0, 'admin dashboard: a table is rendered at 390px')
    await checkNoSidewaysScroll('/admin-dashboard')
    await shot('orgs-cards', orgs)

    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(main.getByRole('table')).toBeVisible()
    await shot('orgs-table-desktop', orgs)
    await signOut({ fresh: true })
    await signIn('customer_admin')
    await goto('/findings')
    await expect(main.getByRole('table').first()).toBeVisible()
    await shot('findings-table-desktop')
    await goto('/users')
    await expect(main.getByRole('table')).toBeVisible()
    await shot('users-table-desktop')
  },
  async phone() {
    const results = {}
    const devices = [
      { device: 'phone', expected: { field: '16px', select: '16px' } },
      { device: 'desktop', expected: { field: '15px', select: '14px' } },
    ]
    for (const { device, expected } of devices) {
      if (device === 'desktop') {
        await context.close()
        context = await openContext(DESKTOP)
        page = await context.newPage()
        watch(page)
        await page.goto(`${FRONT}/login`)
      }
      const viewport = page.viewportSize()

      async function checkFieldFonts(label) {
        const fonts = await page.evaluate(() =>
          [...document.querySelectorAll('input, textarea, select')]
            .filter((el) => !['checkbox', 'radio', 'file', 'hidden'].includes(el.type) && el.offsetWidth > 2 && !el.closest('[aria-hidden="true"]'))
            .map((el) => ({ tag: el.tagName.toLowerCase(), type: el.type, name: el.getAttribute('aria-label') ?? el.labels?.[0]?.innerText ?? el.placeholder ?? el.name, fontSize: getComputedStyle(el).fontSize })),
        )
        steps.push({ label: `${device} ${label} field fonts`, fonts })
        check(fonts.length > 0, `${device} ${label}: no fields found`)
        for (const f of fonts) {
          const want = f.tag === 'select' ? expected.select : expected.field
          check(f.fontSize === want, `${device} ${label}: ${f.tag} "${f.name}" is ${f.fontSize}, expected ${want}`)
        }
      }

      async function checkLastRowClearsFab(label, fabName, addRow) {
        const fab = page.getByRole('button', { name: fabName })
        await expect(fab).toBeVisible()
        const pageMain = page.getByRole('main')
        for (let n = 1; n <= 15 && !(await pageMain.evaluate((el) => el.scrollHeight > el.clientHeight + 200)); n++) {
          await addRow(n)
        }
        check(await pageMain.evaluate((el) => el.scrollHeight > el.clientHeight), `${device} ${label}: the page never got long enough to scroll`)
        const gap = await page.getByRole('main').evaluate((main) => {
          main.scrollTop = main.scrollHeight
          const content = [...main.children].filter((el) => getComputedStyle(el).position !== 'fixed')
          const contentBottom = Math.max(...content.map((el) => el.getBoundingClientRect().bottom))
          const fabTop = [...main.children].find((el) => getComputedStyle(el).position === 'fixed').getBoundingClientRect().top
          return { contentBottom, fabTop }
        })
        steps.push({ label: `${device} ${label} last row vs Fab`, ...gap })
        check(gap.contentBottom <= gap.fabTop, `${device} ${label}: last row ends at ${gap.contentBottom}, Fab starts at ${gap.fabTop}`)
        await shot(`${device}-${label}-bottom`)
      }

      await signIn('customer_admin')
      await page.getByRole('button', { name: 'Select' }).click()
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
      await checkFieldFonts('itop-form')
      await shot(`${device}-itop-form`)

      await goto('/business-context')
      await page.getByRole('button', { name: 'Import documents' }).first().click()
      await expect(page.getByRole('dialog', { name: 'Import documents' })).toBeVisible()
      await checkFieldFonts('business-context-import')
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Fill it in by hand' }).click()
      for (const step of ['Profile', 'Location', 'Operations', 'Digital footprint', 'Risk']) {
        await page.getByRole('tab', { name: new RegExp(step) }).click()
        await checkFieldFonts(`business-context-${step}`)
      }
      await shot(`${device}-business-context`)

      await goto('/users')
      await expect(page.getByText('viewer@acme.example')).toBeVisible()
      await checkFieldFonts('users')
      await checkLastRowClearsFab('users', 'Invite user', async (n) => {
        await page.getByRole('button', { name: 'Invite user' }).click()
        const invite = page.getByRole('dialog', { name: 'Invite user' })
        await invite.getByLabel('Email').fill(`phone${n}@acme.example`)
        await invite.getByRole('button', { name: 'Send invitation' }).click()
        await expect(invite).toBeHidden()
        await expect(page.getByRole('main').getByText(`phone${n}@acme.example`, { exact: true })).toBeVisible()
      })

      await goto('/findings')
      const tabs = page.getByRole('main').getByRole('tablist').first()
      await expect(tabs).toBeVisible()
      const fade = await tabs.evaluate((el) => ({ overflowing: el.scrollWidth > el.clientWidth, end: el.hasAttribute('data-overflow-end'), mask: getComputedStyle(el).maskImage }))
      steps.push({ label: `${device} findings tab list`, ...fade })
      check(fade.end === fade.overflowing, `${device}: tab list overflowing ${fade.overflowing} but end fade ${fade.end}`)
      await shot(`${device}-findings-tabs`)
      if (fade.overflowing) {
        await tabs.evaluate((el) => { el.scrollLeft = el.scrollWidth })
        await page.waitForFunction((el) => el.hasAttribute('data-overflow-start') && !el.hasAttribute('data-overflow-end'), await tabs.elementHandle())
        await shot(`${device}-findings-tabs-scrolled`)
      }

      await page.getByRole('button', { name: 'Open CVE-2021-41773' }).click()
      const detail = page.getByRole('dialog')
      await expect(detail.getByRole('heading', { name: 'Score' })).toBeVisible()
      await shot(`${device}-finding-detail`)
      const box = await detail.boundingBox()
      const why = await detail.getByRole('heading', { name: 'Why it is here' }).boundingBox()
      const radius = await detail.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)
      steps.push({ label: `${device} finding detail`, box, radius, whyTop: why?.y, viewport })
      const fullScreen = box.x === 0 && box.y === 0 && box.width === viewport.width && box.height === viewport.height
      check(fullScreen === (device === 'phone'), `${device}: detail box ${JSON.stringify(box)} vs viewport ${JSON.stringify(viewport)}`)
      check((radius === '0px') === (device === 'phone'), `${device}: detail corner radius ${radius}`)
      check(why && why.y + why.height <= viewport.height, `${device}: "Why it is here" starts below the first screen (${JSON.stringify(why)})`)
      await detail.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(detail).toBeHidden()

      await (device === 'phone' ? page.getByRole('button', { name: 'Menu', includeHidden: true }).click().then(() => page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click()) : signOut())
      await page.waitForURL('**/login')
      await openSignInFromLanding()
      await signIn('platform_admin')
      await expect(page.getByRole('searchbox')).toBeVisible()
      await checkFieldFonts('tenants')
      await checkLastRowClearsFab('tenants', 'New organization', async (n) => {
        await page.getByRole('button', { name: 'New organization' }).click()
        await page.getByLabel('Organization name').fill(`Phone ${n} SA`)
        await page.getByRole('button', { name: 'Next' }).click()
        await page.getByRole('textbox', { name: 'Admin email' }).fill(`admin@phone${n}.example`)
        await page.getByRole('button', { name: 'Create and send invitation' }).click()
        await expect(page.getByTestId('customer-card').filter({ hasText: `Phone ${n} SA` })).toBeVisible()
      })
      results[device] = 'ok'
    }
    steps.push({ label: 'devices', results })
  },
  async connect() {
    await signIn('customer_admin')
    await shot('selector')
    await page.getByRole('button', { name: 'Select' }).click()
    // Rejected profile: the translated error from the API code must show.
    await fillItop({ ...ITOP, user: 'admin' })
    await page.getByRole('button', { name: 'Test connection' }).click()
    await expect(page.getByRole('alert').filter({ hasText: "does not have the 'REST Services User' profile" })).toBeVisible()
    await shot('admin-rejected')
    await page.getByLabel('User', { exact: true }).fill(ITOP.user)
    await page.getByRole('button', { name: 'Test connection' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Connection successful' })).toBeVisible()
    await shot('test-ok')
    await page.getByRole('button', { name: 'Connect and sync' }).click()
    await expect(page.getByText('iTop connected')).toBeVisible()
    await expect(assetList()).toBeVisible()
    await shot('connected')
    const [created] = callsTo('POST', '/cmdb/source').filter((c) => c.path === '/cmdb/source')
    check(created?.body?.user === ITOP.user && created?.body?.url === ITOP.url, `connect request mismatch: ${JSON.stringify(created)}`)
    // The session and the stored source both survive a reload.
    await page.reload()
    await expect(page.getByText('iTop connected')).toBeVisible()
    check(page.url().endsWith('/config'), `reload left /config: ${page.url()}`)
    await shot('after-reload')
  },

  async 'sync-edit-disconnect'() {
    await signIn('customer_admin')
    await connect()
    await page.getByRole('button', { name: 'Sync now' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Sync complete.' })).toBeVisible()
    await shot('synced')
    await page.getByRole('button', { name: 'Edit connection' }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit iTop connection' })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('User', { exact: true }).fill('barb-reader-2')
    await dialog.getByLabel('Password', { exact: true }).fill('not-a-real-secret')
    await shot('edit-dialog')
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('barb-reader-2')).toBeVisible()
    await shot('edited')
    await page.getByRole('button', { name: 'Disconnect' }).click()
    await expect(page.getByText('This will disconnect the CMDB.')).toBeVisible()
    await page.getByRole('button', { name: 'Yes, disconnect' }).click()
    await expect(page.getByRole('heading', { name: 'Choose your CMDB' })).toBeVisible()
    await shot('disconnected')
    check(callsTo('POST', '/cmdb/source/sync').length === 1, 'expected one sync request')
    check(callsTo('PUT', '/cmdb/source')[0]?.body?.user === 'barb-reader-2', 'edit did not send the new user')
    check(callsTo('DELETE', '/cmdb/source').length === 1, 'expected one disconnect request')
  },

  async 'viewer-readonly'() {
    await signIn('viewer')
    await expect(page.getByText('No CMDB is configured for your organization.')).toBeVisible()
    check(await page.getByRole('button', { name: 'Select' }).count() === 0, 'viewer sees the CMDB selector')
    await shot('viewer-not-connected')
    await signOut()
    await signIn('customer_admin')
    await connect()
    await signOut()
    // Signing in returns to the page signed out from: /config either way.
    await signIn('viewer')
    await expect(page.getByText('iTop connected')).toBeVisible()
    await expect(assetList()).toBeVisible()
    for (const name of ['Sync now', 'Edit connection', 'Disconnect', 'Triage them']) {
      check(await page.getByRole('button', { name }).count() === 0, `viewer sees "${name}"`)
    }
    await shot('viewer-connected')
  },

  async inventory() {
    await signIn('customer_admin')
    await connect()
    const filters = page.getByRole('group', { name: 'Filter assets' })
    // Type, Criticality, Exposure, Information Classification and Area are multi-selects: the list stays open between picks, Escape closes it.
    const choose = async (label, ...options) => {
      await filters.getByRole('combobox', { name: label }).click()
      for (const name of options) await page.getByRole('option', { name, exact: true }).click()
      await page.keyboard.press('Escape')
    }
    const removeChip = (name) => filters.getByRole('button', { name: `Remove ${name}` }).click()
    await expect(page.getByText('7 assets')).toBeVisible()
    await shot('filters-default', filters)
    await page.getByLabel('Status').selectOption('all')
    await expect(page.getByText('8 assets')).toBeVisible()
    await shot('all-statuses', assetList())
    await filters.getByRole('button', { name: /^Filters/ }).click()
    await expect(filters.getByRole('combobox', { name: 'Type' })).toBeVisible()
    await choose('Type', 'Server', 'Virtual Machine')
    await expect(assetOption('core-switch-01')).toBeHidden()
    await expect(page.getByText('7 assets')).toBeVisible()
    await shot('two-kinds', filters)
    const twoKinds = callsTo('GET', '/assets').at(-1)?.path ?? ''
    check(/kind=server&kind=virtual_machine/.test(twoKinds), `two Kinds not sent as repeated keys: ${twoKinds}`)
    await removeChip('Virtual Machine')
    await expect(page.getByText('2 assets')).toBeVisible()
    await shot('servers-only', assetList())
    // The first Asset is selected; picking another shows its record.
    await assetOption('crm-db-primary').click()
    await expect(assetRecord('crm-db-primary')).toBeVisible()
    await assetList().press('ArrowUp')
    await expect(assetRecord('prod-api-01')).toBeVisible()
    await expect(assetRecord('prod-api-01').getByText('internal-billing-agent')).toBeVisible()
    await expect(assetRecord('prod-api-01').getByText('Unidentified', { exact: true })).toBeVisible()
    await shot('record', assetRecord('prod-api-01'))
    await choose('Criticality', 'Low')
    await expect(page.getByText('No assets match these filters.')).toBeVisible()
    await shot('no-matches', page.getByText('No assets match these filters.'))
    check(await page.getByRole('navigation', { name: 'Pages' }).count() === 0, 'pager shown without a next cursor')
    const last = callsTo('GET', '/assets').at(-1)?.path ?? ''
    check(/active=all/.test(last) && /kind=server/.test(last) && /criticality=low/.test(last), `last /assets query missing filters: ${last}`)
    await removeChip('Server')
    await removeChip('Low')
    await expect(page.getByText('8 assets')).toBeVisible()
    await choose('Criticality', 'Unknown')
    await expect(page.getByText('1 asset', { exact: true })).toBeVisible()
    await expect(assetOption('erp-app-02')).toBeVisible()
    await shot('unknown-criticality', filters)
    const unknown = callsTo('GET', '/assets').at(-1)?.path ?? ''
    check(/criticality=unknown/.test(unknown) && !/kind=/.test(unknown), `unknown Criticality query wrong: ${unknown}`)
    await removeChip('Unknown')
    await choose('Area', 'Infrastructure', 'Legacy ERP (inactive)')
    await expect(page.getByText('5 assets', { exact: true })).toBeVisible()
    await expect(assetOption('erp-app-02')).toBeVisible()
    await expect(assetOption('analytics-worker-03')).toBeHidden()
    await shot('two-areas', filters)
    const areas = callsTo('GET', '/assets').at(-1)?.path ?? ''
    check(/area=1&area=3/.test(areas), `two Areas not sent as repeated ids: ${areas}`)
    await removeChip('Infrastructure')
    await removeChip('Legacy ERP (inactive)')
    // ledger-db has no Exposure from iTop but a Declared one, so it is not Unknown.
    await page.getByLabel('Status').selectOption('true')
    await choose('Exposure', 'Unknown')
    await expect(page.getByText('4 assets')).toBeVisible()
    await expect(assetOption('ledger-db')).toBeHidden()
    await expect(assetOption('core-switch-01')).toBeVisible()
    await shot('unknown-exposure', filters)
    await choose('Information Classification', 'Public', 'Unclassified')
    await expect(page.getByText('4 assets')).toBeVisible()
    await shot('exposure-and-classification', filters)
    const both = callsTo('GET', '/assets').at(-1)?.path ?? ''
    check(
      /exposure=unknown/.test(both) &&
        /information_classification=public&information_classification=unclassified/.test(both),
      `Exposure and Classification query wrong: ${both}`,
    )
  },

  async triage() {
    await signIn('customer_admin')
    await connect()
    await expect(page.getByText('5 Assets need triage.')).toBeVisible()
    await shot('banner')
    // The banner counts two filtered reads, not a scan of the whole inventory.
    const counted = callsTo('GET', '/assets').filter((call) => /limit=200/.test(call.path)).map((call) => call.path)
    check(counted.some((query) => /active=true/.test(query) && /exposure=unknown/.test(query)), `no Unknown Exposure read: ${counted.join(', ')}`)
    check(counted.some((query) => /active=true/.test(query) && /information_classification=unclassified/.test(query)), `no Unclassified read: ${counted.join(', ')}`)
    check(counted.length === 2, `expected two triage reads: ${counted.join(', ')}`)
    await page.getByRole('button', { name: 'Triage them' }).click()
    const sheet = page.getByRole('dialog', { name: 'Triage Assets' })
    await expect(sheet.getByText('1 of 5')).toBeVisible()
    // The Unknown Exposures come first: 1 of 5 is analytics-worker-03, missing both values.
    await expect(sheet.getByText('analytics-worker-03')).toBeVisible()
    await sheet.getByRole('radio', { name: /^Internal/ }).check()
    await expect(sheet.getByText('Internal lowers the Score')).toBeVisible()
    await sheet.getByRole('button', { name: 'Declare Exposure' }).click()
    await expect(sheet.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
    await shot('exposure-declared')
    for (let i = 0; i < 4; i++) await sheet.getByRole('button', { name: 'Next', exact: true }).click()
    // 5 of 5 is prod-api-01: Exposure comes from iTop, Information Classification is missing.
    await expect(sheet.getByText('5 of 5')).toBeVisible()
    await expect(sheet.getByText('prod-api-01')).toBeVisible()
    // Most sensitive first (ADR 0037).
    const levels = await sheet.getByRole('region', { name: 'Information Classification' }).getByRole('radio').evaluateAll((radios) => radios.map((r) => r.value))
    check(levels.join() === 'highly_confidential,confidential,private,public', `classification order: ${levels}`)
    await sheet.getByRole('radio', { name: /^Highly Confidential/ }).check()
    await sheet.getByRole('button', { name: 'Declare Classification' }).click()
    await expect(sheet.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
    await shot('classification-declared')
    await sheet.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(sheet.getByText('2 of 5 Assets triaged')).toBeVisible()
    await shot('summary')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(sheet).toBeHidden()
    // prod-api-01 is now triaged; analytics-worker-03 still has no Classification.
    await expect(page.getByText('4 Assets need triage.')).toBeVisible()
    // Single mode: the record's Exposure button opens the sheet for that Asset; clearing goes back to
    // iTop's value. iTop has none for a Virtual Machine, so the button reads "Clear", not "Use iTop's".
    await assetOption('analytics-worker-03').click()
    await assetRecord('analytics-worker-03').getByRole('button', { name: /^Exposure of analytics-worker-03: Internal, declared/ }).click()
    const single = page.getByRole('dialog', { name: 'Triage Asset' })
    const exposure = single.getByRole('region', { name: 'Exposure' })
    await exposure.getByRole('button', { name: 'Clear' }).click()
    await expect(exposure.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
    await shot('exposure-cleared')
    await page.keyboard.press('Escape')
    await expect(assetRecord('analytics-worker-03').getByRole('button', { name: /^Exposure of analytics-worker-03: Unknown, from iTop/ })).toBeVisible()
    check(callsTo('PUT', '/assets/1/information-classification')[0]?.body?.information_classification === 'highly_confidential', 'classification request mismatch')
    check(callsTo('PUT', '/assets/2/exposure')[0]?.body?.exposure === 'internal', 'exposure request mismatch')
    check(callsTo('DELETE', '/assets/2/exposure').length === 1, 'expected one exposure clear')
    // A viewer opens the same sheet read-only.
    await signOut()
    await signIn('viewer')
    await assetRecord('prod-api-01').getByRole('button', { name: /^Information Classification of prod-api-01: Highly Confidential/ }).click()
    const viewerSheet = page.getByRole('dialog', { name: 'Triage Asset' })
    await expect(viewerSheet.getByText('Only a Customer Admin can declare')).toBeVisible()
    for (const name of ['Declare Exposure', 'Declare Classification', 'Clear']) {
      check(await viewerSheet.getByRole('button', { name }).count() === 0, `viewer sees "${name}"`)
    }
    await shot('viewer-sheet')
  },

  async areas() {
    await signIn('customer_admin')
    await connect()
    await tab('Areas').click()
    await expect(page.getByText('2 areas')).toBeVisible()
    await shot('areas')
    const row = (name) => page.getByRole('row').filter({ hasText: name })
    await row('Data Platform').getByRole('button', { name: 'Set owner' }).click()
    const dialog = page.getByRole('dialog', { name: 'Owner of Data Platform' })
    await dialog.getByLabel('Email').fill('not-an-email')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog.getByText('Enter a valid email.')).toBeVisible()
    await dialog.getByLabel('Email').fill('data-lead@example.com')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog).toBeHidden()
    await expect(row('Data Platform').getByText('data-lead@example.com')).toBeVisible()
    await shot('owner-set')
    await page.getByLabel('Status').last().selectOption('all')
    await expect(page.getByText('3 areas')).toBeVisible()
    await expect(row('Legacy ERP').getByText(/Inactive since/)).toBeVisible()
    await shot('all-areas')
    check(callsTo('PUT', '/areas/2/owner')[0]?.body?.email === 'data-lead@example.com', 'owner request mismatch')
    check(callsTo('PUT', '/areas/').length === 1, 'the invalid email reached the API')
    await signOut()
    await signIn('viewer')
    await tab('Areas').click()
    await expect(row('Data Platform').getByText('data-lead@example.com')).toBeVisible()
    check(await page.getByRole('button', { name: /owner/ }).count() === 0, 'viewer can edit an owner')
    await shot('viewer-areas')
  },

  async slack() {
    await signIn('customer_admin')
    await tab('Slack').click()
    await expect(page.getByRole('heading', { name: "BARBATTACK isn't delivering to Slack yet" })).toBeVisible()
    await shot('not-connected')
    // Connect opens Slack's consent page in a popup; slack.com is blocked, only the URL is checked.
    const popupOpened = context.waitForEvent('page')
    await page.getByRole('button', { name: 'Connect Slack' }).click()
    const popup = await popupOpened
    await popup.waitForLoadState().catch(() => {})
    check(externalRequests.some((url) => url.startsWith('https://slack.com/oauth/v2/authorize')), `popup did not open Slack: ${externalRequests.join(', ')}`)
    await popup.close()
    // Finishing the OAuth happens on Slack and the backend; seed what it would leave behind.
    await seedMockBackend('barbattack_slack_installation', {
      team_id: 'T0123456789', team_name: 'BARBATTACK Demo', channel_id: '', channel_name: '', state: 'active',
    })
    await seedMockBackend('barbattack_slack_deliveries', [{
      target: '#security-team', target_kind: 'channel', attempts: 3, created_at: new Date().toISOString(),
      failure_code: 'channel_unreachable', last_error: 'not_in_channel', kind: 'finding',
    }])
    await tab('Slack').click()
    await expect(page.getByText('Slack connected')).toBeVisible()
    check(await page.getByRole('button', { name: 'Send test' }).isDisabled(), 'Send test enabled without a channel')
    await page.getByLabel('Security Team channel').selectOption({ label: '#security-team' })
    await expect(page.getByText('#security-team').first()).toBeVisible()
    await page.getByRole('button', { name: 'Send test' }).click()
    await expect(page.getByText('Test message sent to #security-team.')).toBeVisible()
    await shot('channel-and-test')
    await expect(page.getByText('1 failed delivery')).toBeVisible()
    await page.getByRole('button', { name: 'Retry all' }).click()
    await expect(page.getByText('Returned 1 deliveries to the queue.')).toBeVisible()
    await expect(page.getByText('No failed deliveries.')).toBeVisible()
    await shot('retried')
    check(callsTo('PUT', '/slack/installation')[0]?.body?.channel_id === 'C09SECGRP1', 'channel request mismatch')
    await signOut()
    await signIn('viewer')
    await tab('Slack').click()
    await expect(page.getByText('Slack connected')).toBeVisible()
    for (const name of ['Send test', 'Disconnect']) {
      check(await page.getByRole('button', { name }).count() === 0, `viewer sees "${name}"`)
    }
    await shot('viewer')
    await signOut()
    await signIn('customer_admin')
    await tab('Slack').click()
    await page.getByRole('button', { name: 'Disconnect' }).click()
    await page.getByRole('button', { name: 'Yes, disconnect' }).click()
    await expect(page.getByRole('heading', { name: "BARBATTACK isn't delivering to Slack yet" })).toBeVisible()
    await shot('disconnected')
    check(callsTo('DELETE', '/slack/installation').length === 1, 'expected one Slack disconnect')
  },

  async findings() {
    await signIn('customer_admin')
    await sidebarLink('Findings').click()
    await expect(page.getByText('20 findings, 4 groups')).toBeVisible()
    for (const n of [1, 2, 3, 4]) await expect(page.getByText(`Group ${n}`, { exact: true })).toBeVisible()
    await shot('order')
    await page.getByRole('button', { name: 'Open CVE-2021-41773' }).click()
    const detail = page.getByRole('dialog')
    await expect(detail.getByRole('heading', { name: 'Score' })).toBeVisible()
    check(new URL(page.url()).searchParams.has('finding'), 'the open Finding is not in the URL')
    await shot('detail')
    // The open Finding lives in the URL, so a reload lands on it.
    await page.reload()
    await expect(detail.getByRole('heading', { name: 'Action plan' })).toBeVisible()
    await detail.getByRole('button', { name: 'Get an action plan' }).click()
    await expect(detail.getByText('Writing the plan')).toBeVisible()
    await expect(detail.getByText(/^Written /)).toBeVisible(15000)
    await shot('plan', detail.getByText(/^Written /))
    // The technical sections start folded and unfold on demand.
    await detail.getByRole('button', { name: /^Vulnerability/ }).click()
    await expect(detail.getByText('CVSS 3.1 vector')).toBeVisible()
    await shot('vulnerability', detail.getByRole('button', { name: /^Vulnerability/ }))
    const text = await detail.innerText()
    check(!/Luna|Prioritizer|Cartógrafo|Editor|Analista|agent|inferred|Scoring Model/i.test(text), 'the detail names an agent, an inference or the Scoring Model')
    await detail.getByRole('button', { name: 'Should be attended earlier' }).click()
    await detail.getByRole('textbox', { name: 'Why', exact: true }).fill('Customer-facing and exploited in the wild.')
    await detail.getByRole('button', { name: 'Send' }).click()
    await expect(detail.getByText('Saved.')).toBeVisible()
    await shot('feedback', detail.getByText('Saved.'))
    await detail.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(detail).toBeHidden()
    const plans = callsTo('POST', '/prioritizations/').filter((c) => c.path.endsWith('/plans'))
    const feedback = callsTo('POST', '/prioritizations/').filter((c) => c.path.endsWith('/feedback'))
    check(plans.length === 1, 'expected one plan request')
    check(feedback[0]?.body?.verdict === 'should_be_earlier', `feedback request mismatch: ${JSON.stringify(feedback[0]?.body)}`)
  },

  // The detail's folded history, right under the Score, lists every change of the Finding's
  // place, newest first, and its reason says nothing of the moves.
  async 'finding-history'() {
    await signIn('customer_admin')
    await sidebarLink('Findings').click()
    await expect(page.getByText('20 findings, 4 groups')).toBeVisible()
    await page.getByRole('button', { name: 'Open CVE-2024-23897' }).click()
    const detail = page.getByRole('dialog', { name: 'CVE-2024-23897' })
    const reason = detail.getByRole('region', { name: 'Why it is here' })
    await expect(reason).toBeVisible()
    check(!/Moved|history/.test(await reason.innerText()), 'the reason tells the moves')
    await detail.getByRole('button', { name: /^Prioritization history/ }).click()
    const history = detail.getByRole('region', { name: /^Prioritization history/ })
    await expect(history.getByText('Moved down from Group 1 to 2')).toBeVisible()
    await expect(history.getByText(/New above it: “Fallos con exploit activo/)).toBeVisible()
    await expect(history.getByText('Moved up from Group 3 to 1')).toBeVisible()
    await expect(history.getByText('Entered the order in Group 3')).toBeVisible()
    await expect(history.getByText('Risk level changed: Low → Medium')).toBeVisible()
    await expect(history.getByText('Score 19 · By Score alone #17 · In the prioritization #5–#9')).toBeVisible()
    await expect(history.getByText('Ahead of the Score').first()).toBeVisible()
    await shot('history', history)
    await history.getByRole('button', { name: 'Why it was placed there' }).first().click()
    await expect(history.getByText(/sube al primer grupo/)).toBeVisible()
    await shot('older-reason', history.getByText(/sube al primer grupo/))
    const text = await detail.innerText()
    check(!/Luna|Prioritizer|Cartógrafo|Editor|Analista|agent|\bAI\b|inferred|Scoring Model/i.test(text), 'the detail names an agent, the AI, an inference or the Scoring Model')
    // A round that placed it again in the same group still shows, with what led to it.
    await detail.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('button', { name: 'Open CVE-2025-1094' }).click()
    const other = page.getByRole('dialog', { name: 'CVE-2025-1094' })
    await other.getByRole('button', { name: /^Prioritization history/ }).click()
    await expect(other.getByText('Looked at again; still in Group 2')).toBeVisible()
    await shot('kept-its-group', other.getByText('Looked at again; still in Group 2'))
    const calls = callsTo('GET', '/findings/').filter((c) => c.path.endsWith('/history'))
    check(calls.length >= 2 && calls.every((c) => c.status === 200), `history calls: ${JSON.stringify(calls.map((c) => [c.path, c.status]))}`)
  },

  // The Summary's Overview: the sync line, the open count with what opened and closed in the last
  // 30 days, the Critical count, what the teams fixed against the month before, the backlog line
  // whose title says where it is heading beside the closes panel, Start here and Coming back soon,
  // with no "?" help anywhere. Then a failed Sync's line. No call to the endpoints only
  // the old charts used.
  async summary() {
    await signIn('customer_admin')
    await sidebarLink('Configuration').click()
    await connect()
    await sidebarLink('Summary').click()
    check(await tab('Overview').getAttribute('aria-selected') === 'true', 'the Summary did not open on the Overview')
    await expect(page.getByText(/^Inventory synced /)).toBeVisible()
    const open = page.getByRole('region', { name: 'Open right now' })
    await expect(open.getByText('26 new in the last 30 days')).toBeVisible()
    const critical = page.getByRole('region', { name: 'Critical, open right now' })
    await expect(critical.getByText('3 of them are on internet-facing assets')).toBeVisible()
    const backlog = page.getByRole('img', { name: /^Findings open at the end of each week since Sep 29/ })
    await expect(page.getByRole('heading', { name: 'The open backlog is growing' })).toBeVisible()
    await expect(backlog.getByText('12', { exact: true })).toBeVisible()
    await expect(backlog.getByText('23', { exact: true })).toBeVisible()
    const fixed = page.getByRole('region', { name: 'Fixed by your teams in the last 30 days' })
    await expect(fixed.getByText('38', { exact: true })).toBeVisible()
    await expect(fixed.getByText('↑ from 31 the month before')).toBeVisible()
    await expect(fixed.getByText('Half of the Critical ones were fixed within 6 days')).toBeVisible()
    const closes = page.getByRole('region', { name: '52 closed in the last 30 days' })
    const rows = await closes.getByRole('listitem').allTextContents()
    check(
      rows.length === 3 && rows[0].startsWith('38Fixed: ') && rows[1].startsWith('9Went away: ') && rows[2].startsWith('5Set aside: '),
      `the closes panel rows: ${JSON.stringify(rows)}`,
    )
    await shot('overview')
    await shot('closes', closes)
    const areas = page.getByRole('region', { name: '3 Areas need help' })
    await expect(areas.getByText('A Critical open for 47 days and opened more than it closed three weeks in a row')).toBeVisible()
    await expect(areas.getByText('A Critical open for 34 days', { exact: true })).toBeVisible()
    await expect(areas.getByText('25 assets · No owner')).toBeVisible()
    check(await areas.getByRole('row').count() === 6, 'the Areas card does not show 5 rows')
    await expect(areas.getByText('3 more Areas on track: Corporate IT, Marketing Sites, and Assets without an Area. They hold 2 High findings and no Critical.')).toBeVisible()
    await shot('areas', areas)
    await areas.getByRole('button', { name: 'Show all 8 Areas' }).click()
    check(await areas.getByRole('row').count() === 9, 'Show all did not list every Area')
    await shot('areas-expanded', areas)
    const startHere = page.getByRole('region', { name: 'Start here' })
    await expect(startHere.getByRole('link', { name: 'Open the prioritized list' })).toBeVisible()
    await expect(startHere.getByText('4 findings, 2 of them Critical')).toBeVisible()
    const services = page.getByRole('region', { name: 'Your critical services' })
    await expect(services.getByText('The ones named in your Business Context.')).toBeVisible()
    await expect(services.getByText('2 Critical open, and 1 of them in the news this week')).toBeVisible()
    await expect(services.getByText('1 Critical open for 12 days')).toBeVisible()
    await expect(services.getByText('No Critical open · 1 High')).toBeVisible()
    await expect(services.getByText('nomina-legacy and hr-portal not found in your inventory')).toBeVisible()
    await shot('critical-services', services)
    check(await services.getByRole('listitem').count() === 5, 'the critical services card does not show 5 rows')
    await services.getByRole('button', { name: 'Show all 7 services' }).click()
    check(await services.getByRole('listitem').count() === 7, 'Show all did not list every service')
    await shot('critical-services-expanded', services)
    await services.getByRole('button', { name: 'Show fewer' }).click()
    check(await services.getByRole('listitem').count() === 5, 'Show fewer did not fold the services back to 5')
    const comingBack = page.getByRole('region', { name: 'Coming back soon' })
    await expect(comingBack.getByText('Nothing set aside comes back in the next 30 days.')).toBeVisible()
    await shot('start-here-and-coming-back', comingBack)
    check(await page.getByRole('button', { name: /^About / }).count() === 0, 'the Overview has a ? help popover')
    for (const retired of ['/findings/breakdown', '/findings/top', '/findings/time-to-close', '/assets/findings-summary']) {
      check(callsTo('GET', retired).length === 0, `the Overview still calls ${retired}`)
    }
    for (const used of ['/cmdb/source', '/findings/summary', '/findings/weekly-trend', '/findings/closed', '/findings/closes', '/areas/health', '/critical-services']) {
      check(callsTo('GET', used).some((c) => c.status === 200), `the Overview did not fetch ${used}`)
    }

    // A failed Sync comes from iTop, which no UI path in mock mode can make fail after a success.
    const source = await page.evaluate(() => JSON.parse(localStorage.getItem('barbattack_cmdb_source')))
    await seedMockBackend('barbattack_cmdb_source', {
      ...source,
      last_sync: '2026-11-20T10:00:00Z',
      last_sync_failure: { at: new Date(Date.now() - 5 * 60_000).toISOString(), error: 'iTop timed out' },
    })
    await expect(page.getByText(/^The last inventory sync failed 5 min.* These numbers are from Nov 20, 2026\.$/)).toBeVisible()
    await expect(open.getByText('26 new in the last 30 days')).toBeVisible()
    await shot('failed-sync')
  },

  // Before & After and Threats share the Summary's second tab. Before & After compares the order
  // by Score alone with the prioritization; a row of its most significant movements opens that
  // Finding's detail over the tab, and closing it comes back. Threats' tactics matrix has no filter
  // and no empty column.
  async 'before-after'() {
    await signIn('customer_admin')
    await tab('Prioritization and threats').click()
    check(new URL(page.url()).searchParams.get('tab') === 'analysis', 'the second tab is not in the URL')
    // The tab's own sections hold the Cards' sections, so the innermost one is the Card.
    const movements = page.locator('section', { has: page.getByRole('heading', { name: 'Most significant movements' }) }).last()
    await expect(movements.getByRole('button', { name: 'Open CVE-2024-23897' })).toBeVisible()
    const headers = await movements.getByRole('columnheader').allTextContents()
    check(!headers.includes('Reason'), `the movements still have a Reason column: ${headers}`)
    await shot('movements', movements)
    await movements.getByRole('row').filter({ has: page.getByRole('button', { name: 'Open CVE-2024-23897' }) }).click({ position: { x: 300, y: 10 } })
    const detail = page.getByRole('dialog', { name: 'CVE-2024-23897' })
    await expect(detail.getByRole('button', { name: /^Prioritization history/ })).toBeVisible()
    check(new URL(page.url()).searchParams.get('tab') === 'analysis', 'the detail left the second tab')
    await shot('detail', detail)
    await detail.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(detail).toBeHidden()
    check(await tab('Prioritization and threats').getAttribute('aria-selected') === 'true', 'closing the detail left the second tab')
    check(!new URL(page.url()).searchParams.has('finding'), 'the closed detail is still in the URL')

    const tactics = page.locator('section', { has: page.getByRole('heading', { name: 'Findings per tactic' }) }).last()
    await expect(tactics.getByText('No findings: Resource Dev., Exfiltration')).toBeVisible()
    const tacticButtons = await tactics.getByRole('button').allTextContents()
    check(tacticButtons.length === 1 && await tactics.getByRole('button', { name: 'About Findings per tactic' }).count() === 1, `the tactics matrix has more than its ? help: ${tacticButtons}`)
    await shot('tactics', tactics)

    await goto('/dashboard?tab=before-after')
    await page.waitForURL('**/dashboard?tab=analysis')
    check(await tab('Prioritization and threats').getAttribute('aria-selected') === 'true', 'the legacy Before & After link did not open the second tab')
  },

  // A viewer closes a Finding by hand as postponed from its detail, sees it counted as closed
  // at once, finds it in the Closed tab and reopens it from there.
  async 'finding-closes'() {
    await signIn('viewer')
    await sidebarLink('Findings').click()
    await expect(page.getByText('20 findings, 4 groups')).toBeVisible()
    await expect(page.getByText('23', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Open CVE-2024-6387' }).click()
    const detail = page.getByRole('dialog', { name: 'CVE-2024-6387' })
    await expect(detail.getByRole('heading', { name: 'Is it in the right place?' })).toBeVisible()

    const verdicts = await detail.getByRole('group', { name: 'Is it in the right place?' }).getByRole('button').allTextContents()
    check(JSON.stringify(verdicts.map((v) => v.slice(1))) === JSON.stringify(['It applies', 'Should be attended earlier', 'Should be attended later']), `verdicts: ${verdicts}`)
    check(await detail.getByRole('textbox', { name: 'Why' }).count() === 0, 'the Why shows before a verdict is chosen')
    await detail.getByRole('button', { name: 'It applies' }).click()
    check(await detail.getByRole('button', { name: 'Send' }).isDisabled(), 'Send is enabled with no why')
    await shot('feedback-form', detail.getByRole('button', { name: 'Send' }))

    // Close finding is offered once, in the top bar.
    check(await detail.getByRole('button', { name: /close finding|close the finding/i }).count() === 1, 'Close finding is offered more than once')
    await detail.getByRole('button', { name: 'Close finding', exact: true }).click()
    const close = page.getByRole('dialog', { name: 'Close CVE-2024-6387' })
    await expect(close).toBeVisible()
    await close.getByRole('radio', { name: 'Postponed' }).click()
    await close.getByRole('button', { name: 'In 30 days' }).click()
    await close.getByRole('textbox', { name: 'Why' }).fill('Next maintenance window.')
    await shot('close-dialog')
    await close.getByRole('button', { name: 'Close finding' }).click()
    await expect(close).toBeHidden()
    await expect(detail.getByRole('button', { name: 'Reopen' })).toBeVisible()
    await expect(detail.getByText('Next maintenance window.').first()).toBeVisible()
    await shot('detail-closed')

    await detail.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(detail).toBeHidden()
    await expect(page.getByText('22', { exact: true })).toBeVisible()
    const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Open CVE-2024-6387' }) })
    await expect(row.getByText('Closed', { exact: true })).toBeVisible()
    await shot('list-closed', row)

    await tab('Closed').click()
    const closedRow = page.getByRole('row').filter({ hasText: 'CVE-2024-6387' })
    await expect(closedRow.getByText('Postponed')).toBeVisible()
    await expect(closedRow.getByRole('cell', { name: /2026|2027/ }).last()).toBeVisible()
    // The table scrolls inside its panel: the row's last button must sit inside it, not past its edge.
    const panelBox = await page.getByRole('table').locator('..').boundingBox()
    const reopenBox = await closedRow.getByRole('button', { name: 'Reopen CVE-2024-6387' }).boundingBox()
    check(reopenBox && panelBox && reopenBox.x + reopenBox.width <= panelBox.x + panelBox.width, 'Reopen is past the edge of the table')
    await shot('closed-tab')
    await closedRow.getByRole('button', { name: 'Reopen CVE-2024-6387' }).click()
    const confirm = page.getByRole('dialog', { name: 'Reopen CVE-2024-6387?' })
    await confirm.getByRole('button', { name: 'Yes, reopen' }).click()
    await expect(page.getByText('No findings closed by hand')).toBeVisible()
    await shot('closed-tab-empty')

    const [closed] = callsTo('POST', '/findings/').filter((c) => c.path.endsWith('/close'))
    check(closed?.body?.reason === 'postponed' && closed.body.note === 'Next maintenance window.', `close request mismatch: ${JSON.stringify(closed?.body)}`)
    check(/T00:00:00[+-]\d{2}:\d{2}$/.test(closed.body.reopen_at ?? ''), `reopen_at is not a start of day with its offset: ${closed.body.reopen_at}`)
    check(callsTo('POST', '/findings/').filter((c) => c.path.endsWith('/reopen')).length === 1, 'expected one reopen request')
    check(callsTo('GET', '/findings/summary').length >= 2, 'the counts were not fetched again after the close')
  },

  async news() {
    await signIn('viewer')
    await sidebarLink('News').click()
    const groups = page.getByRole('main').getByRole('region')
    await expect(groups.filter({ hasText: 'Attacks in your sector' })).toBeVisible()
    const headings = await groups.getByRole('heading', { level: 2 }).allInnerTexts()
    check(
      JSON.stringify(headings) === JSON.stringify(['They name you', 'They mention vulnerabilities open on your assets', 'They mention technology or suppliers you use', 'Attacks in your sector']),
      `groups out of order: ${JSON.stringify(headings)}`,
    )
    await shot('newest')
    await shot('finding-and-footprint', page.getByRole('heading', { name: /PostgreSQL libpq Flaw/ }))
    await shot('peers', groups.filter({ hasText: 'Attacks in your sector' }).getByRole('heading', { level: 2 }))
    const documentHeight = await page.evaluate(() => document.scrollingElement.scrollHeight)
    check(documentHeight === page.viewportSize().height, `the document is ${documentHeight}px tall, so it scrolls past the layout`)
    await page.getByRole('navigation').hover()
    await page.mouse.wheel(0, 2000)
    await page.waitForTimeout(300)
    check(await page.evaluate(() => window.scrollY) === 0, 'a wheel over the sidebar scrolled the document')
    await shot('after-wheel-over-sidebar')
    const credit = page.getByRole('link', { name: /^Source: Ransomware\.live/ })
    check(await credit.count() === 2, `expected 2 Ransomware.live credits, got ${await credit.count()}`)
    await page.getByLabel('Digest').selectOption({ index: 1 })
    await expect(page.getByText("The summary for this digest couldn't be written")).toBeVisible()
    check(new URL(page.url()).searchParams.has('digest'), 'the open digest is not in the URL')
    await shot('older-without-editor')
    // The open digest lives in the URL, so a reload lands on it.
    await page.reload()
    await expect(page.getByRole('heading', { name: /Leaked AWS Keys/ })).toBeVisible()
    await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'ES' }).click()
    await page.getByLabel('Edición').selectOption({ index: 0 })
    await expect(page.getByRole('heading', { name: 'Los nombran a ustedes' })).toBeVisible()
    await shot('newest-es')
    check(callsTo('GET', '/news-digests?limit=30').length >= 1, 'the digests were not listed')
    check(callsTo('GET', '/news-digests/').length >= 2, 'expected the newest and the older digest to be read')
  },

  async language() {
    await signIn('customer_admin')
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible()
    await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'ES' }).click()
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible()
    await shot('spanish')
    const stored = await page.evaluate(() => localStorage.getItem('language'))
    check(stored === 'es', `localStorage.language is ${stored}`)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible()
    const pressed = await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'ES' }).getAttribute('aria-pressed')
    check(pressed === 'true', 'ES is not marked active after reload')
    // The sign-in page has no switcher but follows the stored choice.
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('button', { name: 'Administrador (customer_admin)' })).toBeVisible()
    await shot('login-in-spanish')
  },

  async navigation() {
    await goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Threat intelligence for the assets your business runs on' })).toBeVisible()
    await shot('landing-signed-out')
    await page.getByRole('link', { name: 'Sign in' }).first().click()
    await page.waitForURL('**/login')
    await goto('/users')
    await page.waitForURL('**/login')
    await shot('guard-to-login')
    // Signing in returns to the page the guard turned away.
    await signIn('customer_admin', '/users')
    for (const link of ['Dashboard', 'Findings', 'News', 'Configuration', 'Business context', 'Users']) {
      await expect(sidebarLink(link)).toBeVisible()
    }
    // A session survives a typed URL and a reload.
    await goto('/tenants')
    await expect(page.getByText('Access denied')).toBeVisible()
    await shot('forbidden')
    await goto('/does-not-exist')
    await expect(page.getByText('Page not found')).toBeVisible()
    await shot('not-found')
    await page.getByRole('link', { name: 'Back to home' }).click()
    await page.waitForURL('**/dashboard')
    await goto('/')
    await shot('landing-signed-in')
    await page.getByRole('link', { name: 'Open dashboard' }).first().click()
    await page.waitForURL('**/dashboard')
    await signOut()
    await signIn('viewer')
    check(await sidebarLink('Users').count() === 0, 'viewer sees the Users link')
    await goto('/users')
    await expect(page.getByText('Access denied')).toBeVisible()
    await shot('viewer-forbidden-users')
    await signOut({ fresh: true })
    await signIn('platform_admin')
    for (const link of ['Organizations', 'Dashboard']) await expect(sidebarLink(link)).toBeVisible()
    check(await sidebarLink('Configuration').count() === 0, 'platform_admin sees Configuration')
    await expect(page.getByText('superadmin@barbattack.example')).toBeVisible()
    await goto('/config')
    await expect(page.getByText('Access denied')).toBeVisible()
    await shot('platform-admin-forbidden-config')
    await goto('/')
    await page.getByRole('link', { name: 'Open dashboard' }).first().click()
    await page.waitForURL('**/tenants')
    await signOut()
    await shot('signed-out')
  },

  async 'business-context'() {
    await signIn('customer_admin')
    await sidebarLink('Business context').click()
    await expect(page.getByRole('heading', { name: 'Start with your documents' })).toBeVisible()
    await shot('empty')
    await page.getByRole('button', { name: 'Import documents' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Import documents' })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Files').setInputFiles({ name: 'acme.txt', mimeType: 'text/plain', buffer: Buffer.from('ACME Corp runs a payments platform in Mexico.') })
    await shot('import-dialog')
    await dialog.getByRole('button', { name: 'Generate draft' }).click()
    await expect(dialog).toBeHidden(15000)
    await expect(page.getByRole('status').filter({ hasText: 'fields were filled from your documents' })).toBeVisible()
    await shot('draft-applied')
    await page.getByRole('tab', { name: /Digital footprint/ }).click()
    const domains = page.getByLabel('Domains')
    await domains.fill('https://www.Example.COM/path')
    await domains.press('Enter')
    await expect(page.getByText('example.com', { exact: true })).toBeVisible()
    await shot('domain-canonical')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
    await shot('saved')
    const saved = callsTo('PUT', '/business-context').at(-1)
    check(JSON.stringify(saved?.body ?? {}).includes('"example.com"'), `saved body lacks example.com: ${JSON.stringify(saved?.body)}`)
    await signOut()
    await signIn('viewer', '/business-context')
    await page.getByRole('tab', { name: /Digital footprint/ }).click()
    // The viewer sees each list as one comma-separated line, not as chips.
    await expect(page.getByText(/(^|, )example\.com(,|$)/)).toBeVisible()
    for (const name of ['Save', 'Import documents']) {
      check(await page.getByRole('button', { name, exact: true }).count() === 0, `viewer sees "${name}"`)
    }
    await shot('viewer-readonly')
  },

  async users() {
    await signIn('customer_admin')
    await sidebarLink('Users').click()
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
    await expect(page.getByText('3 users')).toBeVisible()
    await expect(page.getByText('Invitation pending')).toBeVisible()
    await shot('list')
    await page.getByRole('button', { name: 'Invite user' }).click()
    const invite = page.getByRole('dialog', { name: 'Invite user' })
    await invite.getByLabel('Email').fill('new@acme.example')
    await invite.getByRole('combobox').selectOption({ label: 'Admin' })
    await shot('invite-dialog')
    await invite.getByRole('button', { name: 'Send invitation' }).click()
    await expect(invite).toBeHidden()
    await expect(page.getByText('Invitation sent to new@acme.example.')).toBeVisible()
    await expect(page.getByText('4 users')).toBeVisible()
    const row = (email) => page.getByRole('row').filter({ hasText: email })
    await row('admin@acme.example').getByRole('button', { name: 'Disable' }).click()
    await page.getByRole('dialog', { name: 'Disable user' }).getByRole('button', { name: 'Yes, disable' }).click()
    await expect(page.getByText('4 users · 1 disabled')).toBeVisible()
    await shot('disabled')
    // new@acme.example is now the only active admin: demoting it must be refused.
    await row('new@acme.example').getByRole('button', { name: 'Edit role' }).click()
    const edit = page.getByRole('dialog', { name: 'Change role' })
    await edit.getByRole('combobox').selectOption({ label: 'Viewer' })
    await edit.getByRole('button', { name: 'Save' }).click()
    await expect(edit.getByRole('alert').filter({ hasText: 'Cannot remove the last admin' })).toBeVisible()
    await shot('last-admin-refused')
    check(callsTo('POST', '/users')[0]?.body?.email === 'new@acme.example', 'invite request mismatch')
  },

  async tenants() {
    await signIn('platform_admin')
    await expect(page.getByRole('heading', { name: 'Organizations' })).toBeVisible()
    await expect(page.getByText('3 organizations, 1 deactivated')).toBeVisible()
    await shot('list')
    const create = async (name) => {
      await page.getByRole('button', { name: 'New organization' }).click()
      await page.getByLabel('Organization name').fill(name)
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('textbox', { name: 'Admin email' }).fill('admin@delta.example')
      await page.getByRole('button', { name: 'Create and send invitation' }).click()
    }
    await create('Delta SA')
    await expect(page.getByText('4 organizations, 1 deactivated')).toBeVisible()
    const card = (name) => page.getByTestId('customer-card').filter({ hasText: name })
    await card('Acme Corp').getByRole('button', { name: 'Deactivate', exact: true }).click()
    await page.getByRole('button', { name: 'Yes, deactivate' }).click()
    await expect(page.getByText('4 organizations, 2 deactivated')).toBeVisible()
    await shot('created-and-deactivated')
    await create('beta ltd')
    await expect(page.getByRole('alert').filter({ hasText: 'An organization with this name already exists.' })).toBeVisible()
    await shot('duplicate-refused')
    await page.keyboard.press('Escape')
    await sidebarLink('Dashboard').click()
    await expect(page.getByRole('heading', { name: 'Organizations', level: 2, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'New organizations per month' })).toBeVisible()
    await shot('dashboard')
    steps.push({ label: 'dashboard stat cards', text: await page.getByRole('main').innerText() })
  },
}

if (!scenarios[scenarioName]) {
  console.error(`unknown scenario "${scenarioName}". Choose one of: ${Object.keys(scenarios).join(', ')}`)
  process.exit(2)
}

const executablePath = execFileSync('node', [path.join(here, 'find-browser.mjs')]).toString().trim()
const browser = await chromium.launch({ executablePath, headless: !headed })
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const DESKTOP = { viewport: { width: 1280, height: 900 } }
// Nothing outside the dev server, the mocked API base and the web fonts may be reached (Slack's consent page, for one).
const ALLOWED = [FRONT, API]

// Fresh context = empty localStorage = fresh mock data and no session; English forced so selectors below are stable.
async function openContext(device) {
  const next = await browser.newContext({ locale: 'en-US', ...device })
  await next.route((url) => !ALLOWED.some((origin) => url.href.startsWith(origin)), (route) => {
    externalRequests.push(route.request().url())
    return route.abort()
  })
  // The dev-only React Query Devtools button floats bottom-right, over dialog and sheet footers.
  await next.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      style.textContent = '.tsqd-open-btn-container { display: none !important; }'
      document.head.append(style)
    })
  })
  return next
}

function watch(target) {
  target.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  target.on('pageerror', (e) => consoleErrors.push(String(e)))
  // MSW answers inside the browser, but Playwright still sees each call; this is the side-effect record.
  target.on('response', async (response) => {
    const request = response.request()
    if (!request.url().startsWith(API)) return
    const url = new URL(request.url())
    let body = null
    try { body = request.postDataJSON() } catch { body = request.postData() ? '<non-JSON body>' : null }
    if (body && typeof body === 'object' && 'password' in body) body = { ...body, password: '<redacted>' }
    apiCalls.push({ method: request.method(), path: url.pathname + url.search, status: response.status(), servedByMock: response.fromServiceWorker(), body })
  })
}

context = await openContext(scenarioName === 'phone' ? PHONE : DESKTOP)
page = await context.newPage()
watch(page)

let failure = null
try {
  await page.goto(`${FRONT}/login`)
  await scenarios[scenarioName]()
} catch (error) {
  failure = String(error)
  await shot('FAILURE').catch(() => {})
}
const unmocked = apiCalls.filter((c) => !c.servedByMock)
if (!failure && unmocked.length) failure = `API calls not served by MSW: ${unmocked.map((c) => `${c.method} ${c.path}`).join(', ')}`
writeFileSync(path.join(evidenceDir, 'report.json'), JSON.stringify({ scenario: scenarioName, passed: failure === null, failure, steps, consoleErrors, apiCalls, externalRequests }, null, 2))
await browser.close()
console.log(`${failure ? 'FAIL' : 'PASS'} ${scenarioName} - evidence: ${evidenceDir}`)
if (failure) console.log(failure)
process.exit(failure ? 1 : 0)
