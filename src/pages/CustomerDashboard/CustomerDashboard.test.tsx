import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedSource } from '../../test/render'
import { holdRequests, server } from '../../test/server'

const SUMMARY = { open: 23, critical: 5, high: 8, medium: 7, low: 3, unbanded: 0, kev: 4, critical_internet_facing: 3 }

/** The weekly trend, one week per value of `open_at_end`, the last one the current week. */
function trendOf(...openAtEnd: number[]) {
  const weeks = openAtEnd.map((open, i) => {
    const startsOn = new Date(Date.UTC(2026, 8, 28 + i * 7)).toISOString().slice(0, 10)
    return { week: startsOn, starts_on: startsOn, opened: 0, closed: 0, open_at_end: open }
  })
  server.use(http.get(apiUrl('/findings/weekly-trend'), () => HttpResponse.json({ weeks })))
}

/** Last week ending at `lastWeek` open and the current week at 23, as the summary says. */
function lastWeekEndedWith(lastWeek: number) {
  trendOf(12, lastWeek, 23)
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

  it('shows the sync line, the tabs, then the cards, the backlog line, Start here and Coming back soon', async () => {
    seedSource()
    renderApp('/dashboard')

    const inOrder = [
      await screen.findByText(/^Inventory synced/),
      screen.getByRole('tablist'),
      await openCard(),
      await screen.findByRole('heading', { name: 'The open backlog is growing' }),
      screen.getByRole('region', { name: 'Start here' }),
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
      await within(await openCard()).findByText('↑ 2 since last Monday')

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
    it('says in green how many fewer are open than last Monday', async () => {
      lastWeekEndedWith(41)
      renderApp('/dashboard')

      const change = await within(await openCard()).findByText('↓ 18 since last Monday')
      expect(change).toHaveClass('text-good')
    })

    it('says in red how many more are open than last Monday', async () => {
      lastWeekEndedWith(19)
      renderApp('/dashboard')

      const change = await within(await openCard()).findByText('↑ 4 since last Monday')
      expect(change).toHaveClass('text-critical')
    })

    it('says when as many are open as last Monday', async () => {
      lastWeekEndedWith(23)
      renderApp('/dashboard')

      expect(await within(await openCard()).findByText('No change since last Monday')).toBeInTheDocument()
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

    it('waits for a second week before drawing a trend', async () => {
      trendOf(0, 0, 12)
      renderApp('/dashboard')

      expect(await screen.findByText('The trend appears after your second week.')).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: /^Findings open/ })).not.toBeInTheDocument()
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
      expect(within(card).getByText('1 more')).toBeInTheDocument()
    })

    it('says when nothing set aside comes back in the next 30 days', async () => {
      renderApp('/dashboard')
      const card = await screen.findByRole('region', { name: 'Coming back soon' })

      expect(await within(card).findByText('Nothing set aside comes back in the next 30 days.')).toBeInTheDocument()
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
