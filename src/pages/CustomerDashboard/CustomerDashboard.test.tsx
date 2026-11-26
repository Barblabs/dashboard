import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AreaHealth } from '../../api/areas'
import type { CriticalServiceHealth } from '../../api/businessContext'
import type { WeeklyTrendPoint } from '../../api/findingsTrend'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedSource } from '../../test/render'
import { holdRequests, server } from '../../test/server'

const SUMMARY = { open: 23, critical: 5, high: 8, medium: 7, low: 3, unbanded: 0, kev: 4, critical_internet_facing: 3 }

/** The weekly trend, one week per value of `open_at_end`, the last one the current week. */
function trendOf(...openAtEnd: number[]) {
  weeklyTrendOf(openAtEnd.map((open) => ({ open_at_end: open })))
}

/** The weekly trend, one week per value of `critical_open_at_end`, the last one the current week. */
function criticalTrendOf(...criticalOpenAtEnd: number[]) {
  weeklyTrendOf(criticalOpenAtEnd.map((critical) => ({ open_at_end: 20, critical_open_at_end: critical })))
}

function weeklyTrendOf(points: Partial<WeeklyTrendPoint>[]) {
  const weeks = points.map((point, i) => {
    const startsOn = new Date(Date.UTC(2026, 8, 28 + i * 7)).toISOString().slice(0, 10)
    return { week: startsOn, starts_on: startsOn, opened: 0, closed: 0, open_at_end: 0, critical_open_at_end: 0, ...point }
  })
  server.use(http.get(apiUrl('/findings/weekly-trend'), () => HttpResponse.json({ weeks })))
}

const CLOSES = {
  current: { opened: 26, fixed: 38, went_away: 9, set_aside: 5 },
  previous: { opened: 30, fixed: 31, went_away: 4, set_aside: 6 },
  critical_fixed_median_days: 6,
}

function closesOf(closes: { current?: Partial<typeof CLOSES.current>; previousFixed?: number; median?: number | null }) {
  const body = {
    current: { ...CLOSES.current, ...closes.current },
    previous: { ...CLOSES.previous, fixed: closes.previousFixed ?? CLOSES.previous.fixed },
    critical_fixed_median_days: closes.median === undefined ? CLOSES.critical_fixed_median_days : closes.median,
  }
  server.use(http.get(apiUrl('/findings/closes'), () => HttpResponse.json(body)))
}

let lastAreaId = 0

type AreaFlag =
  | Pick<Extract<AreaHealth, { needs_help: false }>, 'needs_help' | 'reasons'>
  | Pick<Extract<AreaHealth, { reasons: ['growing'] }>, 'needs_help' | 'reasons'>
  | Pick<Extract<AreaHealth, { oldest_critical_days: number }>, 'needs_help' | 'reasons' | 'oldest_critical_days'>

const ON_TRACK: AreaFlag = { needs_help: false, reasons: [] }
const GROWING: AreaFlag = { needs_help: true, reasons: ['growing'] }

function aging(days: number, growing = false): AreaFlag {
  return {
    needs_help: true,
    reasons: growing ? ['aging_critical', 'growing'] : ['aging_critical'],
    oldest_critical_days: days,
  }
}

function area(
  name: string | null,
  counts: Partial<Omit<AreaHealth, 'needs_help' | 'reasons'>> = {},
  flag = ON_TRACK,
): AreaHealth {
  return {
    id: name === null ? null : ++lastAreaId, name, owner_email: 'lead@test.example', asset_count: 10,
    critical_open: 0, high_open: 1, oldest_critical_days: null, fixed: 2, open_now: 3, open_30_days_ago: 3,
    ...counts, ...flag,
  }
}

function areaHealthOf(...areas: AreaHealth[]) {
  server.use(http.get(apiUrl('/areas/health'), () => HttpResponse.json({ areas })))
}

async function areasCard(name: string | RegExp) {
  return screen.findByRole('region', { name })
}

function areaRows(card: HTMLElement) {
  return within(card).getAllByRole('row').slice(1)
}

type ServiceCounts = Pick<CriticalServiceHealth, 'critical_open' | 'high_open' | 'in_the_news' | 'unmatched_assets'>

const NO_COUNTS: ServiceCounts = { critical_open: 0, high_open: 0, in_the_news: 0, unmatched_assets: [] }

function clearService(name: string, counts: Partial<ServiceCounts> = {}): CriticalServiceHealth {
  return { name, status: 'clear', oldest_critical_days: null, ...NO_COUNTS, ...counts }
}

function serviceWithCritical(
  name: string, status: 'at_risk' | 'watch', oldestCriticalDays: number, counts: Partial<ServiceCounts>,
): CriticalServiceHealth {
  return { name, status, oldest_critical_days: oldestCriticalDays, ...NO_COUNTS, ...counts }
}

function criticalServicesOf(...services: CriticalServiceHealth[]) {
  server.use(http.get(apiUrl('/critical-services'), () => HttpResponse.json({ critical_services: services })))
}

async function servicesCard() {
  return screen.findByRole('region', { name: 'Your critical services' })
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString()
}

function closed(cve: string, reason: string, reopenAt: string | null) {
  return {
    id: cve, cve_id: cve, asset_id: 1, asset_name: 'web-01', vendor: 'apache', product: 'http_server',
    component_name: 'Apache', component_version: '2.4.49', note: 'Waiting for the vendor',
    closed_at: daysFromNow(-1), closed_by: 'ana@test.example', reason, reopen_at: reopenAt,
  }
}

async function openCard() {
  return screen.findByRole('region', { name: 'Open right now' })
}

async function fixedCard() {
  return screen.findByRole('region', { name: 'Fixed by your teams in the last 30 days' })
}

async function openAnalysisTab() {
  const user = renderApp('/dashboard')
  await user.click(await screen.findByRole('tab', { name: 'Prioritization and threats' }))
  return user
}

describe('CustomerDashboard', () => {
  it('opens on the Overview tab', async () => {
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { level: 1, name: 'Summary' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('has no ? help popover in the header or the Overview', async () => {
    seedSource()
    renderApp('/dashboard')
    await screen.findByText(/^Inventory synced/)
    await screen.findByRole('heading', { name: 'The open backlog is growing' })
    await screen.findByRole('link', { name: 'Open the prioritized list' })
    await screen.findByText('Nothing set aside comes back in the next 30 days.')

    expect(screen.queryAllByRole('button', { name: /^About / })).toHaveLength(0)
  })

  it('shows the sync line, the tabs, then the cards, the backlog line, the Areas, Start here, the critical services and Coming back soon', async () => {
    seedSource()
    renderApp('/dashboard')

    const inOrder = [
      await screen.findByText(/^Inventory synced/),
      screen.getByRole('tablist'),
      await openCard(),
      await screen.findByRole('heading', { name: 'The open backlog is growing' }),
      await areasCard('3 Areas need help'),
      screen.getByRole('region', { name: 'Start here' }),
      await servicesCard(),
      screen.getByRole('region', { name: 'Coming back soon' }),
    ]
    for (const [before, after] of inOrder.slice(0, -1).map((el, i) => [el, inOrder[i + 1]] as const)) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('keeps the selected tab in the URL', async () => {
    const user = await openAnalysisTab()
    expect(window.location.search).toBe('?tab=analysis')

    await user.click(screen.getByRole('tab', { name: 'Overview' }))
    expect(window.location.search).toBe('')
  })

  it('opens the second tab from its URL, as on a reload', async () => {
    renderApp('/dashboard?tab=analysis')

    expect(await screen.findByRole('tab', { name: 'Prioritization and threats' })).toHaveAttribute('aria-selected', 'true')
  })

  describe('sync line', () => {
    it('says when the inventory was last synced', async () => {
      seedSource({ last_sync: minutesAgo(5) })
      renderApp('/dashboard')

      const line = await screen.findByText(/^Inventory synced 5 min/)
      expect(line.querySelector('span')).toHaveClass('bg-good')
    })

    it('shows no line with no CMDB connected', async () => {
      renderApp('/dashboard')
      await within(await openCard()).findByText('26 new in the last 30 days')

      expect(screen.queryByText(/^Inventory synced|inventory sync failed/)).not.toBeInTheDocument()
    })

    it('says the last sync failed and which day the numbers are from', async () => {
      seedSource({
        last_sync: '2026-11-20T10:00:00Z',
        last_sync_failure: { at: minutesAgo(5), error: 'iTop timed out' },
      })
      renderApp('/dashboard')

      const line = await screen.findByText(/^The last inventory sync failed 5 min.* These numbers are from Nov 20, 2026\.$/)
      expect(line.querySelector('span')).toHaveClass('bg-critical')
      expect(screen.queryByText(/^Inventory synced/)).not.toBeInTheDocument()
    })

    it('says only that the sync failed when none has succeeded yet', async () => {
      seedSource({ last_sync: null, last_sync_failure: { at: minutesAgo(5), error: 'iTop timed out' } })
      renderApp('/dashboard')

      expect(await screen.findByText(/^The last inventory sync failed 5 min\S* ago\.$/)).toBeInTheDocument()
    })

    it('says it synced when a sync succeeded after the failure', async () => {
      seedSource({
        last_sync: minutesAgo(5),
        last_sync_failure: { at: minutesAgo(60), error: 'iTop timed out' },
      })
      renderApp('/dashboard')

      expect(await screen.findByText(/^Inventory synced 5 min/)).toBeInTheDocument()
      expect(screen.queryByText(/failed/)).not.toBeInTheDocument()
    })
  })

  describe('legacy tabs', () => {
    it.each([
      ['/dashboard?tab=before-after', '?tab=analysis'],
      ['/dashboard?tab=threats', '?tab=analysis'],
      ['/dashboard?tab=summary', ''],
      ['/dashboard?tab=risk', ''],
      ['/dashboard?tab=whatever', ''],
      ['/findings?tab=before-after', '?tab=analysis'],
      ['/findings?tab=threats', '?tab=analysis'],
      ['/findings?tab=summary', ''],
      ['/findings?tab=risk', ''],
    ])('%s lands on /dashboard%s', async (from, search) => {
      renderApp(from)

      const selected = search ? 'Prioritization and threats' : 'Overview'
      expect(await screen.findByRole('tab', { name: selected })).toHaveAttribute('aria-selected', 'true')
      expect(window.location.pathname).toBe('/dashboard')
      expect(window.location.search).toBe(search)
    })

    it('sends /dashboard?tab=closed to the closed Findings', async () => {
      renderApp('/dashboard?tab=closed')

      expect(await screen.findByRole('heading', { level: 1, name: 'Findings' })).toBeInTheDocument()
      expect(window.location.pathname).toBe('/findings')
      expect(window.location.search).toBe('?tab=closed')
    })
  })

  describe('Open right now', () => {
    it('says how many were opened in the last 30 days, and adds up no closes', async () => {
      closesOf({ current: { opened: 15, fixed: 7, went_away: 3, set_aside: 2 } })
      renderApp('/dashboard')

      const card = await openCard()
      expect(await within(card).findByText('15 new in the last 30 days')).toBeInTheDocument()
      expect(within(card).queryByText(/closed/)).not.toBeInTheDocument()
    })

    it('says the count failed to load, and loads it on Retry', async () => {
      let failed = false
      server.use(
        http.get(apiUrl('/findings/summary'), () => {
          if (failed) return undefined
          failed = true
          return HttpResponse.json({ code: 'internal_error', error: 'boom' }, { status: 500 })
        }),
      )
      const user = renderApp('/dashboard')
      const card = await openCard()

      const alert = await within(card).findByRole('alert')
      expect(alert).toHaveTextContent('The server had an internal error. Try again.')

      await user.click(within(alert).getByRole('button', { name: 'Retry' }))

      expect(await within(card).findByText('23')).toBeInTheDocument()
      expect(within(card).queryByRole('alert')).not.toBeInTheDocument()
    })

    it('forgets the counts of a CMDB once it is disconnected', async () => {
      seedSource()
      const user = renderApp('/dashboard')
      expect(await within(await openCard()).findByText('23')).toBeInTheDocument()

      await user.click(screen.getByRole('link', { name: 'Configuration' }))
      await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
      await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))
      await screen.findByRole('heading', { name: 'Choose your CMDB' })

      holdRequests('get', '/findings/summary')
      await user.click(screen.getByRole('link', { name: 'Summary' }))
      expect(within(await openCard()).queryByText('23')).not.toBeInTheDocument()
    })
  })

  describe('backlog line', () => {
    it.each([
      ['shrinking', [30, 25, 20]],
      ['growing', [12, 15, 23]],
      ['holding steady', [20, 30, 20]],
    ])('says the backlog is %s, comparing its first week with now', async (direction, values) => {
      trendOf(...values)
      renderApp('/dashboard')

      expect(await screen.findByRole('heading', { name: `The open backlog is ${direction}` })).toBeInTheDocument()
    })

    it('labels the first week, the highest and now, and no other', async () => {
      trendOf(0, 0, 12, 30, 25, 18)
      renderApp('/dashboard')

      const chart = await screen.findByRole('img', { name: /^Findings open at the end of each week since Oct 12/ })
      expect(within(chart).getByText('12')).toBeInTheDocument()
      expect(within(chart).getByText('30')).toBeInTheDocument()
      expect(within(chart).getByText('18')).toBeInTheDocument()
      expect(within(chart).queryByText('25')).not.toBeInTheDocument()
    })

    it('marks the first week and now under the line', async () => {
      trendOf(0, 0, 12, 30, 25, 18)
      renderApp('/dashboard')

      const chart = await screen.findByRole('img', { name: /^Findings open at the end of each week/ })
      expect(within(chart).getByText('Oct 12')).toBeInTheDocument()
      expect(within(chart).getByText('Now')).toBeInTheDocument()
    })

    it('waits for a second week before drawing a trend', async () => {
      trendOf(0, 0, 12)
      renderApp('/dashboard')

      expect(await screen.findByText('The trend appears after your second week.')).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: /^Findings open/ })).not.toBeInTheDocument()
    })
  })

  describe('closes panel', () => {
    it('counts the closes in the last 30 days as Fixed, Went away and Set aside', async () => {
      closesOf({ current: { fixed: 7, went_away: 3, set_aside: 2 } })
      renderApp('/dashboard')
      const panel = await screen.findByRole('region', { name: '12 closed in the last 30 days' })

      expect(within(panel).getAllByRole('listitem').map((row) => row.textContent)).toEqual([
        '7Fixed: patched, as the CMDB now shows, or marked remediated',
        '3Went away: asset retired or CVE withdrawn',
        '2Set aside: accepted risk, postponed or false positive.',
      ])
    })

    it('says how many set aside come back in the next 30 days, and by when', async () => {
      server.use(
        http.get(apiUrl('/findings/closed'), () =>
          HttpResponse.json({
            findings: [
              closed('CVE-0000-0001', 'postponed', daysFromNow(3)),
              closed('CVE-0000-0002', 'accepted_risk', daysFromNow(20)),
              closed('CVE-0000-0003', 'postponed', daysFromNow(40)),
            ],
          }),
        ),
      )
      renderApp('/dashboard')
      const panel = await screen.findByRole('region', { name: /closed in the last 30 days$/ })

      const setAside = within(panel).getAllByRole('listitem')[2]
      expect(await within(setAside).findByText(/^2 come back before \w{3} \d+, \d{4}$/)).toBeInTheDocument()
    })

    it('counts a finding closed by hand as Set aside once it is closed', async () => {
      const user = renderApp('/dashboard')
      await screen.findByRole('region', { name: '52 closed in the last 30 days' })

      await user.click(screen.getByRole('link', { name: 'Findings' }))
      await user.click(await screen.findByRole('button', { name: 'Open CVE-2024-6387' }))
      const detail = await screen.findByRole('dialog', { name: 'CVE-2024-6387' })
      await user.click(within(detail).getByRole('button', { name: 'Close finding' }))
      const close = await screen.findByRole('dialog', { name: 'Close CVE-2024-6387' })
      await user.click(within(close).getByRole('radio', { name: 'Postponed' }))
      await user.click(within(close).getByRole('button', { name: 'In 30 days' }))
      await user.type(within(close).getByLabelText('Why'), 'Next maintenance window.')
      await user.click(within(close).getByRole('button', { name: 'Close finding' }))
      await within(detail).findByRole('button', { name: 'Reopen' })
      await user.click(within(detail).getByRole('button', { name: 'Close' }))

      await user.click(screen.getByRole('link', { name: 'Summary' }))
      const panel = await screen.findByRole('region', { name: '53 closed in the last 30 days' })
      expect(within(panel).getAllByRole('listitem')[2]).toHaveTextContent(/^6Set aside: /)
    })

    it('says when nothing was closed in the last 30 days', async () => {
      closesOf({ current: { fixed: 0, went_away: 0, set_aside: 0 } })
      renderApp('/dashboard')

      const panel = await screen.findByRole('region', { name: 'Nothing closed in the last 30 days.' })
      expect(within(panel).queryByRole('listitem')).not.toBeInTheDocument()
    })
  })

  describe('Start here', () => {
    it('shows the first two groups of the prioritization and how many of each are Critical', async () => {
      renderApp('/dashboard')
      const card = await screen.findByRole('region', { name: 'Start here' })

      const [first, second, ...rest] = await within(card).findAllByRole('listitem')
      expect(rest).toHaveLength(0)
      expect(within(first).getByText('Fallos con exploit activo sobre servicios expuestos a internet')).toBeInTheDocument()
      expect(within(first).getByText('4 findings, 2 of them Critical')).toBeInTheDocument()
      expect(within(second).getByText('Explotados activamente, activos internos con servicios de pago y CI/CD')).toBeInTheDocument()
      expect(within(second).getByText('5 findings, 0 of them Critical')).toBeInTheDocument()
      expect(within(card).getByRole('link', { name: 'Open the prioritized list' })).toHaveAttribute('href', '/findings')
    })

    it('says there are no findings yet before the first prioritization', async () => {
      server.use(http.get(apiUrl('/prioritizations'), () => HttpResponse.json({ prioritizations: [] })))
      renderApp('/dashboard')
      const card = await screen.findByRole('region', { name: 'Start here' })

      expect(await within(card).findByText(/^No findings yet\./)).toBeInTheDocument()
    })
  })

  describe('Coming back soon', () => {
    it('lists the soonest three set aside to come back in the next 30 days, and how many more', async () => {
      server.use(
        http.get(apiUrl('/findings/closed'), () =>
          HttpResponse.json({
            findings: [
              closed('CVE-0000-0001', 'remediated', null),
              closed('CVE-0000-0002', 'postponed', daysFromNow(40)),
              closed('CVE-0000-0003', 'postponed', daysFromNow(-2)),
              closed('CVE-0000-0004', 'accepted_risk', daysFromNow(20)),
              closed('CVE-0000-0005', 'postponed', daysFromNow(3)),
              closed('CVE-0000-0006', 'postponed', daysFromNow(29)),
              closed('CVE-0000-0007', 'accepted_risk', daysFromNow(10)),
            ],
          }),
        ),
      )
      renderApp('/dashboard')
      const card = await screen.findByRole('region', { name: 'Coming back soon' })

      const rows = await within(card).findAllByRole('listitem')
      expect(rows.map((r) => r.firstChild?.textContent)).toEqual([
        'CVE-0000-0005 on web-01',
        'CVE-0000-0007 on web-01',
        'CVE-0000-0004 on web-01',
      ])
      expect(within(rows[0]).getByText(/^Postponed by ana@test\.example · back \w{3} \d+, \d{4}$/)).toBeInTheDocument()
      expect(within(rows[1]).getByText(/^Accepted risk by ana@test\.example · back /)).toBeInTheDocument()
      // CVE-0000-0006, on day 29, is the one left out.
      expect(within(card).getByRole('link', { name: '1 more in Manual closures' })).toHaveAttribute(
        'href',
        '/findings?tab=closed',
      )
    })

    it('says when nothing set aside comes back in the next 30 days', async () => {
      renderApp('/dashboard')
      const card = await screen.findByRole('region', { name: 'Coming back soon' })

      expect(await within(card).findByText('Nothing set aside comes back in the next 30 days.')).toBeInTheDocument()
    })
  })

  describe('Fixed by your teams in the last 30 days', () => {
    it('counts what was fixed and says in green that it is more than the month before', async () => {
      closesOf({ current: { fixed: 38 }, previousFixed: 31 })
      renderApp('/dashboard')
      const card = await fixedCard()

      expect(await within(card).findByText('38')).toBeInTheDocument()
      expect(within(card).getByText('↑ from 31 the month before')).toHaveClass('text-good')
    })

    it('says in red that fewer were fixed than the month before', async () => {
      closesOf({ current: { fixed: 40 }, previousFixed: 52 })
      renderApp('/dashboard')

      expect(await within(await fixedCard()).findByText('↓ from 52 the month before')).toHaveClass('text-critical')
    })

    it('says when as many were fixed as the month before', async () => {
      closesOf({ current: { fixed: 31 }, previousFixed: 31 })
      renderApp('/dashboard')

      expect(await within(await fixedCard()).findByText('Same as the month before')).toBeInTheDocument()
    })

    it('says within how many days half of the Critical ones were fixed, rounding the median up', async () => {
      closesOf({ median: 4.2 })
      renderApp('/dashboard')

      expect(await within(await fixedCard()).findByText('Half of the Critical ones were fixed within 5 days')).toBeInTheDocument()
    })

    it('leaves the Critical line out when no Critical one was fixed', async () => {
      closesOf({ median: null })
      renderApp('/dashboard')
      const card = await fixedCard()
      await within(card).findByText('↑ from 31 the month before')

      expect(within(card).queryByText(/^Half of the Critical/)).not.toBeInTheDocument()
    })
  })

  describe('Critical, open right now', () => {
    it('counts the Critical in the Critical colour and how many are internet-facing', async () => {
      renderApp('/dashboard')
      const card = await screen.findByRole('region', { name: 'Critical, open right now' })

      expect(await within(card).findByText('5')).toHaveClass('text-critical')
      expect(within(card).getByText('3 of them are on internet-facing assets')).toBeInTheDocument()
    })

    it('reads None in navy when there is no Critical', async () => {
      server.use(http.get(apiUrl('/findings/summary'), () => HttpResponse.json({ ...SUMMARY, critical: 0, critical_internet_facing: 0 })))
      renderApp('/dashboard')
      const card = await screen.findByRole('region', { name: 'Critical, open right now' })

      expect(await within(card).findByText('None')).toHaveClass('text-navy')
      expect(within(card).queryByText(/internet-facing/)).not.toBeInTheDocument()
    })

    it.each([
      ['in green that it went down', [4, 9, 6], '↓ 3 since last Monday', 'text-good'],
      ['in red that it went up', [4, 6, 8], '↑ 2 since last Monday', 'text-critical'],
      ['that it did not change', [4, 6, 6], 'No change since last Monday', 'text-gray'],
    ])('says %s since the end of last week', async (_, criticalOpenAtEnd, wording, colour) => {
      criticalTrendOf(...criticalOpenAtEnd)
      renderApp('/dashboard')
      const card = await screen.findByRole('region', { name: 'Critical, open right now' })

      expect(await within(card).findByText(wording)).toHaveClass(colour)
    })

    it('leaves the change out before a second week of the trend', async () => {
      trendOf(0, 0, 12)
      renderApp('/dashboard')
      await screen.findByText('The trend appears after your second week.')

      const card = screen.getByRole('region', { name: 'Critical, open right now' })
      expect(within(card).queryByText(/since last Monday/)).not.toBeInTheDocument()
    })
  })

  describe('Areas that need help', () => {
    it('flags each Area with the reason it needs help', async () => {
      areaHealthOf(
        area('Infrastructure', { critical_open: 2 }, aging(47)),
        area('Data Platform', {}, GROWING),
        area('Payments'),
      )
      renderApp('/dashboard')

      const card = await areasCard('2 Areas need help')
      const [infrastructure, dataPlatform, payments] = areaRows(card)
      expect(infrastructure).toHaveTextContent('Needs help')
      expect(within(infrastructure).getByText('A Critical open for 47 days')).toBeInTheDocument()
      expect(within(infrastructure).getByText('47 days')).toHaveClass('text-critical')
      expect(dataPlatform).toHaveTextContent('Needs help')
      expect(within(dataPlatform).getByText('Opened more than it closed three weeks in a row')).toBeInTheDocument()
      expect(payments).not.toHaveTextContent('Needs help')
    })

    it('joins both reasons in one sentence', async () => {
      areaHealthOf(
        area('Infrastructure', { critical_open: 1 }, aging(31, true)),
      )
      renderApp('/dashboard')

      const card = await areasCard('1 Area needs help')
      expect(
        within(card).getByText('A Critical open for 31 days and opened more than it closed three weeks in a row'),
      ).toBeInTheDocument()
    })

    it('says no Area needs help when none is flagged', async () => {
      areaHealthOf(area('Payments'))
      renderApp('/dashboard')

      const card = await areasCard('No Area needs help')
      expect(within(card).queryByText('Needs help')).not.toBeInTheDocument()
    })

    it('lists every flagged Area, fills up to 5 rows, and sums the rest until Show all lists them', async () => {
      areaHealthOf(
        ...['A', 'B', 'C', 'D'].map((name) => area(`Flagged ${name}`, {}, GROWING)),
        area('Customer Portal'),
        area('Corporate IT', { high_open: 2 }),
        area(null, { high_open: 3 }),
      )
      const user = renderApp('/dashboard')

      const card = await areasCard('4 Areas need help')
      expect(areaRows(card)).toHaveLength(5)
      expect(
        within(card).getByText(
          '2 more Areas on track: Corporate IT and Assets without an Area. They hold 5 High findings and no Critical.',
        ),
      ).toBeInTheDocument()

      await user.click(within(card).getByRole('button', { name: 'Show all 7 Areas' }))
      expect(areaRows(card)).toHaveLength(7)
      expect(within(card).getByText('Assets without an Area')).toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: /^Show all/ })).not.toBeInTheDocument()
    })

    it('lists every flagged Area even past 5 rows', async () => {
      areaHealthOf(
        ...['A', 'B', 'C', 'D', 'E', 'F'].map((name) => area(`Flagged ${name}`, {}, GROWING)),
        area('Customer Portal'),
      )
      renderApp('/dashboard')

      const card = await areasCard('6 Areas need help')
      expect(areaRows(card)).toHaveLength(6)
      expect(within(card).getByRole('button', { name: 'Show all 7 Areas' })).toBeInTheDocument()
    })

    it('words each Area\'s open count, oldest Critical and change against 30 days ago, with no links', async () => {
      areaHealthOf(
        area('Infrastructure', { critical_open: 2, high_open: 3, oldest_critical_days: 12, open_now: 9, open_30_days_ago: 3 }),
        area('Payments', { open_now: 2, open_30_days_ago: 13 }),
        area('Data Platform'),
      )
      renderApp('/dashboard')

      const [infrastructure, payments, dataPlatform] = areaRows(await areasCard('No Area needs help'))
      expect(within(infrastructure).getByText('2 Critical · 3 High')).toBeInTheDocument()
      expect(within(infrastructure).getByText('12 days')).not.toHaveClass('text-critical')
      expect(within(infrastructure).getByText('↑ 6')).toBeInTheDocument()
      expect(within(payments).getByText('None')).toBeInTheDocument()
      expect(within(payments).getByText('↓ 11')).toBeInTheDocument()
      expect(within(dataPlatform).getByText('No change')).toBeInTheDocument()
      expect(within(screen.getByRole('region', { name: 'No Area needs help' })).queryByRole('link')).not.toBeInTheDocument()
    })

    it('counts the Critical the rest of the Areas hold instead of saying they hold none', async () => {
      areaHealthOf(
        ...['A', 'B', 'C', 'D', 'E'].map((name) => area(`Young ${name}`, { critical_open: 1, oldest_critical_days: 9 })),
        area('Customer Portal', { critical_open: 1, high_open: 2, oldest_critical_days: 3 }),
      )
      renderApp('/dashboard')

      const card = await areasCard('No Area needs help')
      expect(
        within(card).getByText('1 more Area on track: Customer Portal. They hold 2 High and 1 Critical findings.'),
      ).toBeInTheDocument()
    })

    it('says No owner for an Area nobody owns yet', async () => {
      areaHealthOf(area('Data Platform', { owner_email: null, asset_count: 25 }))
      renderApp('/dashboard')

      const card = await areasCard('No Area needs help')
      expect(within(card).getByText('25 assets · No owner')).toBeInTheDocument()
    })
  })

  describe('Your critical services', () => {
    it('words each service by its status, in the order returned', async () => {
      criticalServicesOf(
        serviceWithCritical('Online payments', 'at_risk', 9, { critical_open: 3, in_the_news: 2 }),
        serviceWithCritical('Card issuing', 'at_risk', 4, { critical_open: 1 }),
        serviceWithCritical('Billing', 'watch', 47, { critical_open: 2 }),
        clearService('Payroll', { high_open: 4 }),
        clearService('Website'),
      )
      renderApp('/dashboard')

      const card = await servicesCard()
      expect(within(card).getByText('The ones named in your Business Context.')).toBeInTheDocument()
      const rows = await within(card).findAllByRole('listitem')
      expect(rows.map((row) => row.textContent)).toEqual([
        'Online paymentsAt risk3 Critical open, and 2 of them in the news this week',
        'Card issuingAt risk1 Critical open, exploited in the wild',
        'BillingWatch2 Critical open for 47 days',
        'PayrollClearNo Critical open · 4 High',
        'WebsiteClearNo Critical open',
      ])
    })

    it('names the Assets of a service that are not in the inventory', async () => {
      criticalServicesOf(
        clearService('Payroll', { unmatched_assets: ['payroll-legacy', 'hr-portal'] }),
        clearService('Website'),
      )
      renderApp('/dashboard')

      const [payroll, website] = await within(await servicesCard()).findAllByRole('listitem')
      expect(within(payroll).getByText('payroll-legacy and hr-portal not found in your inventory')).toBeInTheDocument()
      expect(website).not.toHaveTextContent('not found in your inventory')
    })

    it('lists the first 5 services until Show all lists them, and Show fewer folds them back', async () => {
      criticalServicesOf(...['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name) => clearService(name)))
      const user = renderApp('/dashboard')

      const card = await servicesCard()
      const names = () => within(card).getAllByRole('listitem').map((row) => row.textContent?.charAt(0))
      await within(card).findAllByRole('listitem')
      expect(names()).toEqual(['A', 'B', 'C', 'D', 'E'])

      await user.click(within(card).getByRole('button', { name: 'Show all 7 services' }))
      expect(names()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])

      await user.click(within(card).getByRole('button', { name: 'Show fewer' }))
      expect(names()).toEqual(['A', 'B', 'C', 'D', 'E'])
    })

    it('shows no Show all button when 5 services or fewer are named', async () => {
      criticalServicesOf(...['A', 'B', 'C', 'D', 'E'].map((name) => clearService(name)))
      renderApp('/dashboard')

      const card = await servicesCard()
      expect(await within(card).findAllByRole('listitem')).toHaveLength(5)
      expect(within(card).queryByRole('button')).not.toBeInTheDocument()
    })

    it('sends to Business context to name the services when there are none', async () => {
      criticalServicesOf()
      const user = renderApp('/dashboard')

      await user.click(
        await within(await servicesCard()).findByRole('link', {
          name: 'Name your critical services in Business context to see them here.',
        }),
      )
      expect(window.location.pathname).toBe('/business-context')
    })
  })

  describe('Prioritization and threats', () => {
    it('shows the Before & After matrix, then the tactics matrix', async () => {
      await openAnalysisTab()

      const beforeAfter = screen.getByRole('region', { name: 'Before & After' })
      const threats = screen.getByRole('region', { name: 'Threats' })
      expect(await within(beforeAfter).findByLabelText('3 findings from score group 1 in priority group 1')).toBeInTheDocument()
      expect(await within(threats).findByRole('heading', { name: 'Findings per tactic' })).toBeInTheDocument()
      expect(beforeAfter.compareDocumentPosition(threats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('shows the movement summary cards', async () => {
      await openAnalysisTab()

      const subioLabel = await screen.findByText('Went up')
      expect(subioLabel).toBeInTheDocument()
      expect(screen.getByText('Stayed')).toBeInTheDocument()
      expect(screen.getByText('Went down')).toBeInTheDocument()
      expect(subioLabel.previousElementSibling).toHaveTextContent('6')
    })

    it('explains the movement summary, which has no header, from a ? in its corner', async () => {
      const user = await openAnalysisTab()

      await user.click(await screen.findByRole('button', { name: 'About Before & After' }))

      const help = await screen.findByRole('dialog', { name: 'Before & After' })
      expect(within(help).getByText(/“Match” is the share that stayed/)).toBeInTheDocument()
    })

    it('tells what each colour of the composition per group means', async () => {
      await openAnalysisTab()
      const composition = (await screen.findByRole('heading', { name: 'Risk level per group' })).closest('section')!

      const legend = within(composition).getByRole('list', { name: 'Risk level' })
      expect(within(legend).getAllByRole('listitem').length).toBeGreaterThan(1)
    })

    it('lists the most significant movements without their reason', async () => {
      await openAnalysisTab()

      const table = (await screen.findByRole('heading', { name: 'Most significant movements' })).closest('section')!
      const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
      expect(headers).not.toContain('Reason')
      expect(within(table).getByRole('button', { name: 'Open CVE-2024-23897' })).toBeInTheDocument()
    })

    it("opens a movement's finding over the tab, and closing it comes back to the tab", async () => {
      const user = await openAnalysisTab()
      const table = (await screen.findByRole('heading', { name: 'Most significant movements' })).closest('section')!

      await user.click(within(table).getByRole('button', { name: 'Open CVE-2024-23897' }).closest('tr')!)
      const dialog = await screen.findByRole('dialog', { name: 'CVE-2024-23897' })
      expect(within(dialog).getByRole('button', { name: /^Prioritization history/ })).toBeInTheDocument()
      expect(window.location.search).toContain('finding=')

      await user.click(within(dialog).getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Prioritization and threats' })).toHaveAttribute('aria-selected', 'true')
      expect(window.location.search).not.toContain('finding=')
    })

    it('shows the coverage label with labeled and open counts', async () => {
      await openAnalysisTab()
      expect(await screen.findByText('22 of 35 open findings have an ATT&CK label')).toBeInTheDocument()
    })

    it('shows every role together, a column only for the tactics some finding leads to, and names the rest', async () => {
      await openAnalysisTab()
      const matrix = (await screen.findByRole('heading', { name: 'Findings per tactic' })).closest('section')!

      expect(within(matrix).queryByRole('group')).not.toBeInTheDocument()
      const columns = within(matrix).getAllByRole('columnheader').map((h) => h.textContent)
      expect(columns).toContain('Initial Access')
      expect(columns).toContain('Impact')
      expect(columns).not.toContain('Exfiltration')
      expect(columns).not.toContain('Resource Dev.')
      expect(within(matrix).getByText('No findings: Resource Dev., Exfiltration')).toBeInTheDocument()
    })

    it('shows the top techniques table with technique IDs', async () => {
      await openAnalysisTab()
      expect(await screen.findByRole('heading', { name: 'Top techniques' })).toBeInTheDocument()
      expect(screen.getByText('T1190')).toBeInTheDocument()
      expect(screen.getByText('Exploit Public-Facing Application')).toBeInTheDocument()
    })
  })
})
