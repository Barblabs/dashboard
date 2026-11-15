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
const apiCalls = []
let page

// <main> is the scroll container, so a full-page screenshot only shows the viewport anyway.
// Pass a locator to scroll the part that matters into view first.
async function shot(label, focus) {
  if (focus) await focus.scrollIntoViewIfNeeded()
  const file = `${String(steps.length + 1).padStart(2, '0')}-${label}.png`
  await page.screenshot({ path: path.join(evidenceDir, file) })
  steps.push({ label, screenshot: file, url: page.url() })
}

function check(condition, message) {
  if (!condition) throw new Error(message)
}

const callsTo = (method, pathPrefix) => apiCalls.filter((c) => c.method === method && c.path.startsWith(pathPrefix))

// The app has no persisted session: every page load lands on /login, where mock mode shows a role picker.
const ROLE_BUTTON = {
  platform_admin: 'Super Admin (platform_admin)',
  customer_admin: 'Admin (customer_admin)',
  viewer: 'Viewer (viewer)',
}
async function signIn(role) {
  if (!page.url().endsWith('/login')) await page.goto(`${FRONT}/login`)
  await page.getByRole('button', { name: ROLE_BUTTON[role] }).click()
  await page.waitForURL(role === 'platform_admin' ? '**/tenants' : '**/config')
}
async function signOut() {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('**/login')
}
// Typing a URL reloads the page and drops the session, so in-session URL changes go through the router.
async function openInApp(pathname) {
  await page.evaluate((p) => {
    history.pushState({}, '', p)
    dispatchEvent(new PopStateEvent('popstate'))
  }, pathname)
}
const sidebarLink = (name) => page.getByRole('navigation').getByRole('link', { name, exact: true })

const ITOP = { url: 'http://10.0.0.5:8000', user: 'barb-reader', password: 'not-a-real-secret' }

async function fillItop(login = ITOP) {
  await page.getByLabel('iTop address (IP or URL)').fill(login.url)
  await page.getByLabel('User', { exact: true }).fill(login.user)
  await page.getByLabel('Password').fill(login.password)
}

async function connect() {
  await expect(page.getByRole('heading', { name: 'Choose your CMDB' })).toBeVisible()
  await page.getByRole('button', { name: 'Select' }).click()
  await fillItop()
  await page.getByRole('button', { name: 'Test connection' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Connection successful' })).toBeVisible()
  await page.getByRole('button', { name: 'Connect and sync' }).click()
  await expect(page.getByText('iTop connected')).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
}

const scenarios = {
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
    await expect(page.getByRole('table')).toBeVisible()
    await shot('connected')
    const [created] = callsTo('POST', '/cmdb/source').filter((c) => c.path === '/cmdb/source')
    check(created?.body?.user === ITOP.user && created?.body?.url === ITOP.url, `connect request mismatch: ${JSON.stringify(created)}`)
    // A reload drops the session; the source itself is stored, so it is still connected after signing in again.
    await page.reload()
    await page.waitForURL('**/login')
    await signIn('customer_admin')
    await expect(page.getByText('iTop connected')).toBeVisible()
    await shot('after-reload-and-sign-in')
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
    await dialog.getByLabel('Password').fill('not-a-real-secret')
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
    await signIn('viewer')
    await expect(page.getByText('iTop connected')).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
    for (const name of ['Sync now', 'Edit connection', 'Disconnect']) {
      check(await page.getByRole('button', { name }).count() === 0, `viewer sees "${name}"`)
    }
    await shot('viewer-connected')
  },

  async inventory() {
    await signIn('customer_admin')
    await connect()
    const rows = page.getByRole('table').getByRole('row')
    await page.getByText('4 assets').waitFor()
    steps.push({ label: 'default rows (active only)', rows: (await rows.count()) - 1 })
    await page.getByLabel('Status').selectOption('all')
    await page.getByText('5 assets').waitFor()
    await shot('all-statuses', page.getByRole('table'))
    await page.getByLabel('Type').selectOption('server')
    await page.getByText('2 assets').waitFor()
    await shot('servers-only', page.getByRole('table'))
    await page.getByRole('button', { name: 'Show details of prod-api-01' }).click()
    await expect(page.getByRole('button', { name: 'Hide details of prod-api-01' })).toBeVisible()
    await expect(page.getByText('internal-billing-agent')).toBeVisible()
    await shot('details', page.getByText('internal-billing-agent'))
    await page.getByLabel('Criticality').selectOption('low')
    await expect(page.getByText('No assets match these filters.')).toBeVisible()
    await shot('no-matches', page.getByText('No assets match these filters.'))
    check(await page.getByRole('navigation', { name: 'Pages' }).count() === 0, 'pager shown without a next cursor')
    const last = callsTo('GET', '/assets').at(-1)?.path ?? ''
    check(/active=all/.test(last) && /kind=server/.test(last) && /criticality=low/.test(last), `last /assets query missing filters: ${last}`)
  },

  async language() {
    await signIn('customer_admin')
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible()
    await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'ES' }).click()
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible()
    await shot('spanish')
    const stored = await page.evaluate(() => localStorage.getItem('language'))
    check(stored === 'es', `localStorage.language is ${stored}`)
    // The reload drops the session; the login page must already be in Spanish.
    await page.reload()
    await page.waitForURL('**/login')
    await expect(page.getByRole('button', { name: 'Administrador (customer_admin)' })).toBeVisible()
    await shot('login-in-spanish')
    await page.getByRole('button', { name: 'Administrador (customer_admin)' }).click()
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible()
    const pressed = await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'ES' }).getAttribute('aria-pressed')
    check(pressed === 'true', 'ES is not marked active after reload')
  },

  async navigation() {
    await page.goto(`${FRONT}/config`)
    await page.waitForURL('**/login')
    await shot('guard-to-login')
    await signIn('customer_admin')
    for (const link of ['Findings', 'Configuration', 'Business context', 'Notifications', 'Users']) {
      await expect(sidebarLink(link)).toBeVisible()
    }
    for (const link of ['Findings', 'Notifications']) {
      await sidebarLink(link).click()
      await expect(page.getByRole('heading', { name: link })).toBeVisible()
      await expect(page.getByText('Coming soon')).toBeVisible()
      await shot(`nav-${link.toLowerCase()}`)
    }
    await openInApp('/tenants')
    await expect(page.getByText('Access denied')).toBeVisible()
    await shot('forbidden')
    await openInApp('/does-not-exist')
    await expect(page.getByText('Page not found')).toBeVisible()
    await shot('not-found')
    await signOut()
    await signIn('viewer')
    check(await sidebarLink('Users').count() === 0, 'viewer sees the Users link')
    await openInApp('/users')
    await expect(page.getByText('Access denied')).toBeVisible()
    await shot('viewer-forbidden-users')
    await signOut()
    await signIn('platform_admin')
    for (const link of ['Tenants', 'Dashboard']) await expect(sidebarLink(link)).toBeVisible()
    check(await sidebarLink('Configuration').count() === 0, 'platform_admin sees Configuration')
    await expect(page.getByText('superadmin@barbattack.example')).toBeVisible()
    await openInApp('/')
    await page.waitForURL('**/tenants')
    await openInApp('/config')
    await expect(page.getByText('Access denied')).toBeVisible()
    await shot('platform-admin-forbidden-config')
    await signOut()
    await shot('signed-out')
  },

  async 'business-context'() {
    await signIn('customer_admin')
    await sidebarLink('Business context').click()
    await expect(page.getByRole('heading', { name: 'Start with your documents' })).toBeVisible()
    await shot('empty')
    await page.getByRole('button', { name: 'Import documents' }).click()
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
    await signIn('viewer')
    await sidebarLink('Business context').click()
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
    await expect(page.getByText('2 users')).toBeVisible()
    await shot('list')
    await page.getByRole('button', { name: 'Invite user' }).click()
    const invite = page.getByRole('dialog', { name: 'Invite user' })
    await invite.getByLabel('Email').fill('new@acme.example')
    await invite.getByRole('combobox').selectOption({ label: 'Admin' })
    await shot('invite-dialog')
    await invite.getByRole('button', { name: 'Send invitation' }).click()
    await expect(invite).toBeHidden()
    await expect(page.getByText('3 users')).toBeVisible()
    const row = (email) => page.getByRole('row').filter({ hasText: email })
    await row('admin@acme.example').getByRole('button', { name: 'Disable' }).click()
    await page.getByRole('dialog', { name: 'Disable user' }).getByRole('button', { name: 'Yes, disable' }).click()
    await expect(page.getByText('3 users · 1 disabled')).toBeVisible()
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
    await expect(page.getByText('3 organizations · 1 deactivated')).toBeVisible()
    await shot('list')
    const create = async (name) => {
      await page.getByRole('button', { name: 'New organization' }).click()
      await page.getByLabel('Organization name').fill(name)
      await page.getByRole('button', { name: 'Next' }).click()
      await page.getByRole('textbox', { name: 'Admin email' }).fill('admin@delta.example')
      await page.getByRole('button', { name: 'Create and send invitation' }).click()
    }
    await create('Delta SA')
    await expect(page.getByText('4 organizations · 1 deactivated')).toBeVisible()
    const card = (name) => page.getByTestId('customer-card').filter({ hasText: name })
    await card('Acme Corp').getByRole('button', { name: 'Deactivate', exact: true }).click()
    await page.getByRole('button', { name: 'Yes, deactivate' }).click()
    await expect(page.getByText('4 organizations · 2 deactivated')).toBeVisible()
    await shot('created-and-deactivated')
    await create('beta ltd')
    await expect(page.getByRole('alert').filter({ hasText: 'An organization with this name already exists.' })).toBeVisible()
    await shot('duplicate-refused')
    await page.keyboard.press('Escape')
    await sidebarLink('Dashboard').click()
    await expect(page.getByRole('heading', { name: 'Recent organizations' })).toBeVisible()
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
// Fresh context = empty localStorage = fresh mock data; English forced so selectors below are stable.
const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 900 } })
page = await context.newPage()
const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(String(e)))
// MSW answers inside the browser, but Playwright still sees each call; this is the side-effect record.
page.on('response', async (response) => {
  const request = response.request()
  if (!request.url().startsWith(API)) return
  const url = new URL(request.url())
  let body = null
  try { body = request.postDataJSON() } catch { body = request.postData() ? '<non-JSON body>' : null }
  if (body && typeof body === 'object' && 'password' in body) body = { ...body, password: '<redacted>' }
  apiCalls.push({ method: request.method(), path: url.pathname + url.search, status: response.status(), servedByMock: response.fromServiceWorker(), body })
})

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
writeFileSync(path.join(evidenceDir, 'report.json'), JSON.stringify({ scenario: scenarioName, passed: failure === null, failure, steps, consoleErrors, apiCalls }, null, 2))
await browser.close()
console.log(`${failure ? 'FAIL' : 'PASS'} ${scenarioName} - evidence: ${evidenceDir}`)
if (failure) console.log(failure)
process.exit(failure ? 1 : 0)
