import { http, HttpResponse } from 'msw'
import { apiUrl } from '../url'

export const MOCK_CUSTOMER_STATS = [
  {
    id: 'customer-1',
    name: 'Acme Corp',
    active: true,
    user_count: 5,
    cmdb_connected: true,
    cmdb_last_sync: '2026-11-15T10:00:00Z',
    cmdb_last_sync_failed_at: null,
  },
  {
    id: 'customer-2',
    name: 'Beta Ltd',
    active: true,
    user_count: 3,
    cmdb_connected: true,
    cmdb_last_sync: '2026-11-10T08:00:00Z',
    cmdb_last_sync_failed_at: '2026-11-14T16:00:00Z',
  },
  {
    id: 'customer-3',
    name: 'Gamma Inc',
    active: false,
    user_count: 1,
    cmdb_connected: false,
    cmdb_last_sync: null,
    cmdb_last_sync_failed_at: null,
  },
]

// Syncs that finished n days before today, newest first.
const SYNCS_BY_DAYS_AGO = [
  { succeeded: 2, failed: 0 },
  { succeeded: 1, failed: 1 },
  { succeeded: 2, failed: 0 },
  { succeeded: 2, failed: 0 },
  { succeeded: 1, failed: 1 },
  { succeeded: 2, failed: 0 },
  { succeeded: 2, failed: 0 },
  { succeeded: 1, failed: 1 },
]

const DAY_MS = 24 * 60 * 60 * 1000

function syncDays(days: number) {
  const today = Date.now()
  return Array.from({ length: days }, (_, i) => {
    const daysAgo = days - 1 - i
    const date = new Date(today - daysAgo * DAY_MS).toISOString().slice(0, 10)
    return { date, ...(SYNCS_BY_DAYS_AGO[daysAgo] ?? { succeeded: 0, failed: 0 }) }
  })
}

const SLACK_DELIVERIES = [
  { id: 'customer-1', name: 'Acme Corp', sent: 10, failed: 1, pending: 0 },
  { id: 'customer-2', name: 'Beta Ltd', sent: 5, failed: 0, pending: 2 },
  { id: 'customer-3', name: 'Gamma Inc', sent: 0, failed: 0, pending: 0 },
]

export const adminStatsHandlers = [
  http.get(apiUrl('/customers/stats'), () =>
    HttpResponse.json({ customers: MOCK_CUSTOMER_STATS }),
  ),
  http.get(apiUrl('/customers/sync-health'), ({ request }) =>
    HttpResponse.json({ days: syncDays(Number(new URL(request.url).searchParams.get('days') ?? 30)) }),
  ),
  http.get(apiUrl('/customers/slack-deliveries'), () =>
    HttpResponse.json({ customers: SLACK_DELIVERIES }),
  ),
]
