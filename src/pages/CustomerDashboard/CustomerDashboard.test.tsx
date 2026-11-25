import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedSource } from '../../test/render'
import { holdRequests, server } from '../../test/server'

async function openSummaryTab() {
  const user = renderApp('/dashboard')
  await screen.findByRole('tab', { name: 'Summary' })
  return user
}

async function openBeforeAfterTab() {
  const user = renderApp('/dashboard')
  await user.click(await screen.findByRole('tab', { name: 'Before & After' }))
  return user
}

async function openRiskTab() {
  const user = renderApp('/dashboard')
  await user.click(await screen.findByRole('tab', { name: 'Where the risk is' }))
  return user
}

async function openThreatsTab() {
  const user = renderApp('/dashboard')
  await user.click(await screen.findByRole('tab', { name: 'Threats' }))
  return user
}

describe('CustomerDashboard', () => {
  it('shows the Dashboard heading with Summary tab selected by default', async () => {
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to the Summary tab content', async () => {
    const user = renderApp('/dashboard')
    await user.click(await screen.findByRole('tab', { name: 'Summary' }))

    expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Findings per week')).toBeInTheDocument()
  })

  it('redirects /dashboard?tab=closed to /findings?tab=closed', async () => {
    renderApp('/dashboard?tab=closed')

    expect(await screen.findByRole('heading', { level: 1, name: 'Findings' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/findings')
    expect(window.location.search).toContain('tab=closed')
  })

  describe('summary indicators', () => {
    it('shows indicator cards above the tabs and keeps them when switching tabs', async () => {
      const user = renderApp('/dashboard')

      expect(await screen.findByText('23')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /In KEV/ })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Critical on internet-facing/ })).toBeInTheDocument()

      await user.click(screen.getByRole('tab', { name: 'Before & After' }))
      expect(screen.getByText('23')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /In KEV/ })).toBeInTheDocument()
    })

    it('clicking an indicator navigates to the filtered findings list', async () => {
      const user = renderApp('/dashboard')
      await screen.findByRole('link', { name: /In KEV/ })

      await user.click(screen.getByRole('link', { name: /In KEV/ }))

      expect(await screen.findByText('From the dashboard:')).toBeInTheDocument()
      // "KEV only" appears both as a filter-bar label and as a chip after navigation.
      expect(screen.getAllByText('KEV only')).toHaveLength(2)
      expect(window.location.pathname).toBe('/findings')
    })

    it('shows 0 in navy, not in the alert color', async () => {
      server.use(
        http.get(apiUrl('/findings/summary'), () =>
          HttpResponse.json({ open: 0, critical: 0, high: 0, medium: 0, low: 0, unbanded: 0, kev: 0, critical_internet_facing: 0 }),
        ),
      )
      renderApp('/dashboard')

      const kevCard = await screen.findByRole('link', { name: /In KEV/ })
      // Wait for the data to load: '—' (loading) becomes '0'.
      await within(kevCard).findByText('0')
      const valueSpan = kevCard.querySelector('span:first-child')!
      expect(valueSpan).not.toHaveClass('text-critical')
      expect(valueSpan).toHaveClass('text-navy')
    })

    it('forgets the counts of a CMDB once it is disconnected', async () => {
      seedSource()
      const user = renderApp('/dashboard')
      expect(await screen.findByText('23')).toBeInTheDocument()

      await user.click(screen.getByRole('link', { name: 'Configuration' }))
      await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
      await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))
      await screen.findByRole('heading', { name: 'Choose your CMDB' })

      holdRequests('get', '/findings/summary')
      await user.click(screen.getByRole('link', { name: 'Summary' }))
      expect(await screen.findByText('Critical on internet-facing')).toBeInTheDocument()
      expect(screen.queryByText('23')).not.toBeInTheDocument()
    })
  })

  describe('summary tab', () => {
    it('shows time-to-close bars for bands that have closures', async () => {
      await openSummaryTab()

      expect(await screen.findByText('3.5 days')).toBeInTheDocument()
      expect(screen.getByText('7.2 days')).toBeInTheDocument()
      expect(screen.getByText('14.1 days')).toBeInTheDocument()
      expect(screen.queryByText('45.0 days')).not.toBeInTheDocument()
      expect(screen.queryByText('No risk level')).not.toBeInTheDocument()
    })

    it('shows — and none-closed text for a band with no closures', async () => {
      await openSummaryTab()

      expect(await screen.findByText('—')).toBeInTheDocument()
      expect(screen.getByText('None closed in this period')).toBeInTheDocument()
    })

    it('labels the critical bar with its band name and median days', async () => {
      await openSummaryTab()

      expect(await screen.findByRole('img', { name: 'Critical: 3.5 days' })).toBeInTheDocument()
    })

    it('explains how to read a chart when its ? is hovered', async () => {
      const user = await openSummaryTab()

      await user.hover(await screen.findByRole('button', { name: 'About Findings per week' }))

      const help = await screen.findByRole('dialog', { name: 'Findings per week' })
      // A blank line in the text starts a new paragraph, so each one is an element of its own.
      expect(within(help).getByText(/^How many findings appeared/)).toHaveRole('paragraph')
      expect(within(help).getByText(/^When “Closed” outgrows “New”/)).toHaveRole('paragraph')
    })
  })

  describe('risk tab', () => {
    it('shows Unknown only when some findings sit on an unclassified asset', async () => {
      server.use(
        http.get(apiUrl('/findings/breakdown'), () =>
          HttpResponse.json({
            by: 'exposure',
            groups: [
              { value: 'internet_facing', name: null, critical: 1, high: 0, medium: 0, low: 0, unbanded: 0 },
              { value: 'unknown', name: null, critical: 0, high: 0, medium: 0, low: 0, unbanded: 0 },
            ],
          }),
        ),
      )
      await openRiskTab()
      const heatmap = (await screen.findByRole('heading', { name: 'Where the risk is' })).closest('section')!

      expect(await within(heatmap).findByText('Internet')).toBeInTheDocument()
      expect(within(heatmap).queryByText('Unknown')).not.toBeInTheDocument()
      expect(within(heatmap).queryByText(/"Unknown" are assets/)).not.toBeInTheDocument()
    })

    it('tells what each colour of the asset bars means', async () => {
      await openRiskTab()
      const assets = (await screen.findByRole('heading', { name: 'Assets with most findings' })).closest('section')!

      const legend = await within(assets).findByRole('list', { name: 'Risk level' })
      expect(within(legend).getByText('Critical')).toBeInTheDocument()
    })

    it('clicking a heatmap cell navigates to the prioritized list with band and exposure filters', async () => {
      const user = await openRiskTab()
      const cell = await screen.findByLabelText(/5 findings: Critical on Internet/)
      await user.click(cell)
      expect(await screen.findByText('Risk level: Critical')).toBeInTheDocument()
      expect(screen.getByText('Exposure: Internet-facing')).toBeInTheDocument()
      expect(screen.getByText('From the chart:')).toBeInTheDocument()
    })

    it('clicking an asset bar navigates to the prioritized list', async () => {
      const user = await openRiskTab()
      const assetBar = await screen.findByRole('button', { name: /web-prod-01/ })
      await user.click(assetBar)
      expect(await screen.findByText('Asset: web-prod-01')).toBeInTheDocument()
      expect(screen.getByText('From the chart:')).toBeInTheDocument()
    })

    it('clicking an area heatmap cell navigates with band and area filters', async () => {
      const user = await openRiskTab()
      await user.click(await screen.findByRole('button', { name: 'Area' }))
      const cell = await screen.findByLabelText(/6 findings: High on Producción/)
      await user.click(cell)
      expect(await screen.findByText('Risk level: High')).toBeInTheDocument()
      expect(screen.getByText('Area: Producción')).toBeInTheDocument()
      expect(screen.getByText('From the chart:')).toBeInTheDocument()
    })

    it('shows KEV badges in the CVE table', async () => {
      await openRiskTab()
      const kevBadges = await screen.findAllByText('Yes')
      expect(kevBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('before & after tab', () => {
    it('shows the movement summary cards', async () => {
      await openBeforeAfterTab()

      const subioLabel = await screen.findByText('Went up')
      expect(subioLabel).toBeInTheDocument()
      expect(screen.getByText('Stayed')).toBeInTheDocument()
      expect(screen.getByText('Went down')).toBeInTheDocument()
      expect(subioLabel.previousElementSibling).toHaveTextContent('6')
    })

    it('explains the movement summary, which has no header, from a ? in its corner', async () => {
      const user = await openBeforeAfterTab()

      await user.click(await screen.findByRole('button', { name: 'About Before & After' }))

      const help = await screen.findByRole('dialog', { name: 'Before & After' })
      expect(within(help).getByText(/“Match” is the share that stayed/)).toBeInTheDocument()
    })

    it('tells what each colour of the composition per group means', async () => {
      await openBeforeAfterTab()
      const composition = (await screen.findByRole('heading', { name: 'Risk level per group' })).closest('section')!

      const legend = within(composition).getByRole('list', { name: 'Risk level' })
      expect(within(legend).getAllByRole('listitem').length).toBeGreaterThan(1)
    })

    it('shows diagonal cell for G1 (3 findings stayed in SG1→G1)', async () => {
      await openBeforeAfterTab()

      const cell = await screen.findByLabelText('3 findings from score group 1 in priority group 1')
      expect(cell).toBeInTheDocument()
    })

    it('lists the most significant movements without their reason', async () => {
      await openBeforeAfterTab()

      const table = (await screen.findByRole('heading', { name: 'Most significant movements' })).closest('section')!
      const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
      expect(headers).not.toContain('Reason')
      expect(within(table).getByRole('button', { name: 'Open CVE-2024-23897' })).toBeInTheDocument()
    })

    it("opens a movement's finding over the tab, and closing it comes back to the tab", async () => {
      const user = await openBeforeAfterTab()
      const table = (await screen.findByRole('heading', { name: 'Most significant movements' })).closest('section')!

      await user.click(within(table).getByRole('button', { name: 'Open CVE-2024-23897' }).closest('tr')!)
      const dialog = await screen.findByRole('dialog', { name: 'CVE-2024-23897' })
      expect(within(dialog).getByRole('button', { name: /^Prioritization history/ })).toBeInTheDocument()
      expect(window.location.search).toContain('finding=')

      await user.click(within(dialog).getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Before & After' })).toHaveAttribute('aria-selected', 'true')
      expect(window.location.search).not.toContain('finding=')
    })
  })

  describe('threats tab', () => {
    it('shows the coverage label with labeled and open counts', async () => {
      await openThreatsTab()
      expect(await screen.findByText('22 of 35 open findings have an ATT&CK label')).toBeInTheDocument()
    })

    it('shows every role together, a column only for the tactics some finding leads to, and names the rest', async () => {
      await openThreatsTab()
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
      await openThreatsTab()
      expect(await screen.findByRole('heading', { name: 'Top techniques' })).toBeInTheDocument()
      expect(screen.getByText('T1190')).toBeInTheDocument()
      expect(screen.getByText('Exploit Public-Facing Application')).toBeInTheDocument()
    })
  })
})
