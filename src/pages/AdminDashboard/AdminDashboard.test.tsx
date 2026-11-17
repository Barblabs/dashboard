import type { ReactNode } from 'react'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '../../mocks/url'
import { PLATFORM_ADMIN, renderApp } from '../../test/render'
import { server } from '../../test/server'
import { MOCK_CUSTOMER_STATS } from '../../mocks/handlers/adminStats'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

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

  it('shows the subtitle', async () => {
    await renderDashboard()
    expect(
      screen.getByText('BARBATTACK operations. Counts only: no assets, findings, or customer business data.'),
    ).toBeInTheDocument()
  })

  it('shows organization count with active/deactivated breakdown', async () => {
    await renderDashboard()
    const card = screen.getByText('Organizations', { selector: 'dt' }).parentElement!
    expect(within(card).getByRole('definition').textContent).toBe('3')
    expect(within(card).getByText('2 active · 1 deactivated')).toBeInTheDocument()
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

  it('renders at least two bar charts', async () => {
    await renderDashboard()
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThanOrEqual(2)
  })

  it('shows Slack alerts summary and no-alerts message', async () => {
    await renderDashboard()
    expect(screen.getByText('10 sent · 1 failed · 0 pending')).toBeInTheDocument()
    expect(screen.getByText('No alerts in the last 30 days')).toBeInTheDocument()
  })

  it('shows a load error when /customers/stats fails', async () => {
    server.use(http.get(apiUrl('/customers/stats'), () => HttpResponse.error()))
    renderApp('/admin-dashboard', PLATFORM_ADMIN)
    expect(await screen.findByText('Could not load dashboard data.')).toBeInTheDocument()
  })
})
