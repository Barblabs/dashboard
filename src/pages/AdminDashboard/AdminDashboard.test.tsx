import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../../auth/store'
import { apiUrl } from '../../mocks/url'
import { renderApp } from '../../test/render'
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

const PLATFORM_ADMIN: AuthUser = {
  id: 'platform-admin-id',
  email: 'superadmin@barbattack.example',
  role: 'platform_admin',
  customer: null,
}

// MOCK_CUSTOMERS: Acme (Sep), Beta (Oct), Gamma (Nov, deactivated)
// Today = 2026-11-03 → total=3, active=2, deactivated=1, newThisMonth=1 (Gamma)

async function renderDashboard() {
  const user = renderApp('/admin-dashboard', PLATFORM_ADMIN)
  await screen.findByText(MOCK_CUSTOMERS[2]!.name) // Gamma appears in recent list
  return user
}

describe('AdminDashboard', () => {
  it('shows stat cards with correct numbers', async () => {
    await renderDashboard()

    // Stat card labels (some also appear in recent badges, so use getAllBy)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Deactivated').length).toBeGreaterThan(0)

    // Stat values are standalone digit strings — dates in the recent list contain slashes
    const numbers = screen.getAllByText(/^\d+$/).map((el) => Number(el.textContent))
    expect(numbers).toContain(3) // total
    expect(numbers).toContain(2) // active
    expect(numbers).toContain(1) // deactivated (also newThisMonth = 1)
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
