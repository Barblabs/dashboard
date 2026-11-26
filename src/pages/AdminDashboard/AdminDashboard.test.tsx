import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '../../mocks/url'
import { PLATFORM_ADMIN, renderApp } from '../../test/render'
import { server } from '../../test/server'
import { MOCK_CUSTOMER_STATS } from '../../mocks/handlers/adminStats'

async function renderDashboard() {
  renderApp('/admin-dashboard', PLATFORM_ADMIN)
  await screen.findByText(MOCK_CUSTOMER_STATS[0].name)
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('shows organization count with active/deactivated breakdown', async () => {
    await renderDashboard()
    const card = screen.getByText('Organizations', { selector: 'dt' }).parentElement!
    expect(within(card).getByRole('definition').textContent).toBe('3')
    expect(within(card).getByText('2 active, 1 deactivated')).toBeInTheDocument()
  })

  it('shows total users across all organizations', async () => {
    await renderDashboard()
    const card = screen.getByText('Total users', { selector: 'dt' }).parentElement!
    expect(within(card).getByRole('definition').textContent).toBe('9')
  })

  it('shows CMDB connected ratio', async () => {
    await renderDashboard()
    const card = screen.getByText('CMDB connected', { selector: 'dt' }).parentElement!
    expect(within(card).getByRole('definition').textContent).toBe('2 of 3')
  })

  it('shows failed syncs count over 30 days', async () => {
    await renderDashboard()
    const card = screen.getByText('Failed syncs (30 days)', { selector: 'dt' }).parentElement!
    expect(within(card).getByRole('definition').textContent).toBe('3')
  })

  it('renders the organizations table with all orgs', async () => {
    await renderDashboard()
    const table = screen.getByRole('table')
    expect(within(table).getByText(MOCK_CUSTOMER_STATS[0].name)).toBeInTheDocument()
    expect(within(table).getByText(MOCK_CUSTOMER_STATS[1].name)).toBeInTheDocument()
    expect(within(table).getByText(MOCK_CUSTOMER_STATS[2].name)).toBeInTheDocument()
    expect(within(table).getAllByText('Active').length).toBeGreaterThanOrEqual(1)
    expect(within(table).getByText('Deactivated')).toBeInTheDocument()
  })

  it('shows sync failure warning for Beta Ltd', async () => {
    await renderDashboard()
    const table = screen.getByRole('table')
    const betaRow = within(table).getByText(MOCK_CUSTOMER_STATS[1].name).closest('tr')!
    expect(within(betaRow).getByText(/Failed on/)).toBeInTheDocument()
  })

  it('shows Slack alerts summary and no-alerts message', async () => {
    await renderDashboard()
    expect(screen.getByText('10 sent, 1 failed, 0 pending')).toBeInTheDocument()
    expect(screen.getByText('No alerts in the last 30 days')).toBeInTheDocument()
  })

  it('explains every chart and table from a ? beside its title', async () => {
    await renderDashboard()

    for (const title of ['Organizations', 'Syncs per day (30 days)', 'Slack alerts (30 days)', 'New organizations per month']) {
      expect(await screen.findByRole('button', { name: `About ${title}` })).toBeInTheDocument()
    }
  })

  it('offers a retry in the stats row and the organizations table when /customers/stats is unreachable', async () => {
    server.use(http.get(apiUrl('/customers/stats'), () => HttpResponse.error()))
    renderApp('/admin-dashboard', PLATFORM_ADMIN)
    const messages = await screen.findAllByText('Could not reach the server to load the dashboard.')
    expect(messages).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(2)
  })
})
