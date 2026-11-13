import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '../../mocks/url'
import { PLATFORM_ADMIN, renderApp, seedCustomers } from '../../test/render'
import { server } from '../../test/server'
import { MOCK_CUSTOMERS } from '../../mocks/customers-store'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: unknown }) => <div>{children as never}</div>,
  BarChart: ({ children }: { children: unknown }) => (
    <div data-testid="bar-chart">{children as never}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

async function renderDashboard() {
  const user = renderApp('/admin-dashboard', PLATFORM_ADMIN)
  await screen.findByText(MOCK_CUSTOMERS[2]!.name)
  return user
}

function stat(label: string) {
  const card = screen.getByText(label, { selector: 'dt' }).parentElement!
  return within(card).getByRole('definition').textContent
}

describe('AdminDashboard', () => {
  // Only Date is faked: the app's timers and promises keep running for real.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('counts the organizations by status and those created this month', async () => {
    await renderDashboard()

    expect(stat('Organizations')).toBe('3')
    expect(stat('Active')).toBe('2')
    expect(stat('Deactivated')).toBe('1')
    expect(stat('New this month')).toBe('1')
  })

  it('counts this month from when the page opened, not from when the app loaded', async () => {
    vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
    await renderDashboard()

    expect(stat('New this month')).toBe('0')
  })

  it('counts by the month in the viewer’s time zone, not in UTC', async () => {
    const zone = process.env.TZ
    process.env.TZ = 'America/Mexico_City'
    try {
      // 02:00 UTC on November 1st is still October 31st in Mexico City.
      seedCustomers([{ ...MOCK_CUSTOMERS[0]!, created_at: '2026-11-01T02:00:00Z' }])
      renderApp('/admin-dashboard', PLATFORM_ADMIN)
      await screen.findByText(MOCK_CUSTOMERS[0]!.name)

      expect(stat('New this month')).toBe('0')
    } finally {
      process.env.TZ = zone
    }
  })

  it('shows the recent organizations list', async () => {
    await renderDashboard()

    const recentSection = screen
      .getByText('Recent organizations')
      .closest('section')!
    expect(within(recentSection).getByText(MOCK_CUSTOMERS[0]!.name)).toBeInTheDocument()
    expect(within(recentSection).getByText(MOCK_CUSTOMERS[1]!.name)).toBeInTheDocument()
    expect(within(recentSection).getByText(MOCK_CUSTOMERS[2]!.name)).toBeInTheDocument()
  })

  it('marks each recent organization with a one-word status', async () => {
    await renderDashboard()

    const recentSection = screen.getByText('Recent organizations').closest('section')!
    const row = (name: string) => within(recentSection).getByText(name).closest('li')!
    expect(within(row(MOCK_CUSTOMERS[0]!.name)).getByText('Active')).toBeInTheDocument()
    expect(within(row(MOCK_CUSTOMERS[2]!.name)).getByText('Deactivated')).toBeInTheDocument()
  })

  it('renders the bar chart container', async () => {
    await renderDashboard()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('shows a network error when data cannot be loaded', async () => {
    server.use(http.get(apiUrl('/customers'), () => HttpResponse.error()))
    renderApp('/admin-dashboard', PLATFORM_ADMIN)

    expect(await screen.findByText('Could not reach the server to load the dashboard.')).toBeInTheDocument()
  })
})
