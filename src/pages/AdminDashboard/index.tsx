import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  useCustomersStatsQuery,
  useSlackDeliveriesQuery,
  useSyncHealthQuery,
} from '../../api/adminStats'
import type { CustomerSlackDeliveries, CustomerStats, SyncDay } from '../../api/adminStats'
import { useCustomersQuery, type CustomerResponse } from '../../api/customers'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Badge } from '../../components/ui/Badge'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { Message } from '../../components/ui/Message'
import { useWideLayout } from '../../components/ui/useWideLayout'
import { useDateFormat, useLocale, useRelativeTime } from '../../i18n/format'

// ── monthly chart helpers ─────────────────────────────────────────────────────

function sameMonth(iso: string, month: Date) {
  const date = new Date(iso)
  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
}

function getMonthlyData(customers: CustomerResponse[], locale: string, now: Date) {
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'short' })
  const months: { label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ label: monthLabel.format(date), count: customers.filter((c) => sameMonth(c.created_at, date)).length })
  }
  return months
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-panel bg-white p-5">
      <dt className="font-body text-[0.8125rem] font-semibold text-gray">{label}</dt>
      <dd className="font-title text-[2rem] leading-none text-navy">{value}</dd>
      {sub && <span className="font-body text-[0.75rem] text-gray">{sub}</span>}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

const KEYS = {
  loading: 'adminDashboard.loading',
  failed: 'adminDashboard.loadFailed',
  network: 'adminDashboard.networkError',
} as const

export function AdminDashboardPage() {
  const { t } = useTranslation()

  return (
    <Page title={t('adminDashboard.title')}>
      <ChartErrorBoundary><StatsSection /></ChartErrorBoundary>
      <ChartErrorBoundary><OrgsTableSection /></ChartErrorBoundary>
      <ChartErrorBoundary><SyncChartSection /></ChartErrorBoundary>
      <ChartErrorBoundary><SlackSection /></ChartErrorBoundary>
      <ChartErrorBoundary><MonthlyChartSection /></ChartErrorBoundary>
    </Page>
  )
}

// ── stats row ─────────────────────────────────────────────────────────────────

function StatsSection() {
  const { t } = useTranslation()
  const statsQuery = useCustomersStatsQuery()
  const syncQuery = useSyncHealthQuery()

  const statsData = statsQuery.data
  const syncData = syncQuery.data

  if ((!statsData && statsQuery.error) || (!syncData && syncQuery.error)) {
    return <Message tone="error">{t('adminDashboard.loadFailed')}</Message>
  }

  if (!statsData || !syncData) {
    return <Message>{t('adminDashboard.loading')}</Message>
  }

  const active = statsData.customers.filter((c) => c.active).length
  const deactivated = statsData.customers.filter((c) => !c.active).length
  const usersTotal = statsData.customers.reduce((s, c) => s + c.user_count, 0)
  const cmdbN = statsData.customers.filter((c) => c.cmdb_connected).length
  const cmdbM = statsData.customers.length
  const failedSyncs = syncData.days.reduce((s, d) => s + d.failed, 0)

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label={t('adminDashboard.stats.organizations')}
        value={active + deactivated}
        sub={t('adminDashboard.stats.organizationsSub', { active, deactivated })}
      />
      <StatCard label={t('adminDashboard.stats.usersTotal')} value={usersTotal} />
      <StatCard
        label={t('adminDashboard.stats.cmdbConnected')}
        value={t('adminDashboard.stats.cmdbConnectedValue', { n: cmdbN, total: cmdbM })}
      />
      <StatCard label={t('adminDashboard.stats.failedSyncs')} value={failedSyncs} />
    </dl>
  )
}

// ── organizations table ───────────────────────────────────────────────────────

function OrgsTableSection() {
  return (
    <QueryBoundary query={useCustomersStatsQuery()} keys={KEYS}>
      {(data) => <OrgsTable customers={data.customers} />}
    </QueryBoundary>
  )
}

function syncFailed(c: CustomerStats) {
  if (!c.cmdb_last_sync_failed_at) return false
  if (!c.cmdb_last_sync) return true
  return c.cmdb_last_sync_failed_at > c.cmdb_last_sync
}

function OrgsTable({ customers }: { customers: CustomerStats[] }) {
  const { t } = useTranslation()
  const wide = useWideLayout()

  return (
    <section className="rounded-xl border border-border-panel bg-white">
      <div className="border-b border-border-panel px-6 py-4">
        <h2 className="font-title text-[1rem] text-navy">{t('adminDashboard.orgsTable.title')}</h2>
      </div>
      {customers.length === 0 ? (
        <p className="p-6 font-body text-[0.875rem] text-gray">{t('adminDashboard.orgsTable.empty')}</p>
      ) : wide ? (
        <table className="w-full border-collapse font-body text-[0.875rem]">
          <thead>
            <tr className="text-left text-[0.75rem] font-normal text-gray">
              <th className="px-6 py-3 font-normal">{t('adminDashboard.orgsTable.name')}</th>
              <th className="px-4 py-3 font-normal">{t('adminDashboard.orgsTable.status')}</th>
              <th className="px-4 py-3 font-normal">{t('adminDashboard.orgsTable.users')}</th>
              <th className="px-4 py-3 font-normal">{t('adminDashboard.orgsTable.cmdb')}</th>
              <th className="px-4 py-3 font-normal">{t('adminDashboard.orgsTable.lastSync')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-border-panel hover:bg-panel">
                <td className="px-6 py-3 font-semibold text-navy">{c.name}</td>
                <td className="px-4 py-3">
                  <OrgStatus customer={c} />
                </td>
                <td className="px-4 py-3 tabular-nums text-gray">{c.user_count}</td>
                <td className="px-4 py-3">
                  <CmdbState customer={c} />
                </td>
                <td className="px-4 py-3">
                  <LastSync customer={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="font-body text-[0.875rem]">
          {customers.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 border-t border-border-panel px-4 py-4 first:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 font-semibold wrap-anywhere text-navy">{c.name}</span>
                <OrgStatus customer={c} />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-[0.75rem] text-gray">{t('adminDashboard.orgsTable.users')}</dt>
                <dd className="tabular-nums text-gray">{c.user_count}</dd>
                <dt className="text-[0.75rem] text-gray">{t('adminDashboard.orgsTable.cmdb')}</dt>
                <dd>
                  <CmdbState customer={c} />
                </dd>
                <dt className="text-[0.75rem] text-gray">{t('adminDashboard.orgsTable.lastSync')}</dt>
                <dd>
                  <LastSync customer={c} />
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function OrgStatus({ customer }: { customer: CustomerStats }) {
  const { t } = useTranslation()

  return (
    <Badge variant={customer.active ? 'outline' : 'muted'}>
      {customer.active
        ? t('adminDashboard.orgsTable.statusActive')
        : t('adminDashboard.orgsTable.statusDeactivated')}
    </Badge>
  )
}

function CmdbState({ customer }: { customer: CustomerStats }) {
  const { t } = useTranslation()

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${customer.cmdb_connected ? 'bg-[var(--color-low)]' : 'bg-panel'}`}
      />
      <span className={customer.cmdb_connected ? 'text-navy' : 'text-gray'}>
        {customer.cmdb_connected
          ? t('adminDashboard.orgsTable.cmdbConnected')
          : t('adminDashboard.orgsTable.cmdbNone')}
      </span>
    </span>
  )
}

function LastSync({ customer }: { customer: CustomerStats }) {
  const { t } = useTranslation()
  const relativeTime = useRelativeTime()
  const formatDate = useDateFormat()

  return (
    <>
      <span className="text-gray">
        {customer.cmdb_last_sync ? relativeTime(customer.cmdb_last_sync) : t('adminDashboard.orgsTable.noSync')}
      </span>
      {syncFailed(customer) && customer.cmdb_last_sync_failed_at && (
        <span className="mt-0.5 block font-body text-[0.75rem] text-[var(--color-critical)]">
          {t('adminDashboard.orgsTable.syncFailedAt', { date: formatDate(customer.cmdb_last_sync_failed_at) })}
        </span>
      )}
    </>
  )
}

// ── sync health chart ─────────────────────────────────────────────────────────

function SyncChartSection() {
  return (
    <QueryBoundary query={useSyncHealthQuery()} keys={KEYS}>
      {(data) => <SyncChart days={data.days} />}
    </QueryBoundary>
  )
}

function SyncChart({ days }: { days: SyncDay[] }) {
  const { t } = useTranslation()

  return (
    <section className="rounded-xl border border-border-panel bg-white p-6">
      <h2 className="mb-4 font-title text-[1rem] text-navy">{t('adminDashboard.syncChart.title')}</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--color-border-row)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--color-gray)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'var(--color-gray)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                borderColor: 'var(--color-border-panel)',
                borderRadius: 8,
              }}
              cursor={{ fill: 'var(--color-panel)' }}
            />
            <Bar dataKey="succeeded" name={t('adminDashboard.syncChart.succeeded')} stackId="a" fill="var(--color-navy)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="failed" name={t('adminDashboard.syncChart.failed')} stackId="a" fill="var(--color-critical)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

// ── slack deliveries ──────────────────────────────────────────────────────────

function SlackSection() {
  return (
    <QueryBoundary query={useSlackDeliveriesQuery()} keys={KEYS}>
      {(data) => <SlackBars customers={data.customers} />}
    </QueryBoundary>
  )
}

function SlackBars({ customers }: { customers: CustomerSlackDeliveries[] }) {
  const { t } = useTranslation()

  const rows = customers.map((c) => ({
    ...c,
    total: c.sent + c.failed + c.pending,
  }))
  const maxTotal = Math.max(...rows.map((r) => r.total), 1)

  return (
    <section className="rounded-xl border border-border-panel bg-white p-6">
      <h2 className="mb-4 font-title text-[1rem] text-navy">{t('adminDashboard.slack.title')}</h2>
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3 font-body text-[0.875rem]">
              <span className="font-semibold text-navy">{row.name}</span>
              {row.total === 0 ? (
                <span className="text-gray">{t('adminDashboard.slack.noAlerts')}</span>
              ) : (
                <span className="text-gray">
                  {t('adminDashboard.slack.summary', {
                    sent: row.sent,
                    failed: row.failed,
                    pending: row.pending,
                  })}
                </span>
              )}
            </div>
            {row.total > 0 && (
              <div
                className="relative h-4 overflow-hidden rounded bg-panel"
                style={{ width: `${(row.total / maxTotal) * 100}%` }}
              >
                {(
                  [
                    { key: 'sent', color: 'var(--color-navy)', count: row.sent },
                    { key: 'failed', color: 'var(--color-critical)', count: row.failed },
                    { key: 'pending', color: '#F59E0B', count: row.pending },
                  ] as const
                )
                  .filter(({ count }) => count > 0)
                  .reduce<{ segments: { key: string; color: string; left: number; pct: number }[]; offset: number }>(
                    ({ segments, offset }, { key, color, count }) => {
                      const pct = (count / row.total) * 100
                      return {
                        segments: [...segments, { key, color, left: offset, pct }],
                        offset: offset + pct,
                      }
                    },
                    { segments: [], offset: 0 },
                  )
                  .segments.map(({ key, color, left, pct }) => (
                    <div
                      key={key}
                      className="absolute inset-y-0"
                      style={{ left: `${left}%`, width: `${pct}%`, backgroundColor: color }}
                    />
                  ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── monthly new orgs chart ────────────────────────────────────────────────────

function MonthlyChartSection() {
  return (
    <QueryBoundary query={useCustomersQuery()} keys={KEYS}>
      {({ customers }) => <MonthlyChart customers={customers} />}
    </QueryBoundary>
  )
}

function MonthlyChart({ customers }: { customers: CustomerResponse[] }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const [now] = useState(() => new Date())
  const chartData = getMonthlyData(customers, locale, now)

  return (
    <section className="rounded-xl border border-border-panel bg-white p-6">
      <h2 className="mb-4 font-title text-[1rem] text-navy">{t('adminDashboard.chart.title')}</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--color-border-row)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: 'var(--color-gray)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: 'var(--color-gray)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                borderColor: 'var(--color-border-panel)',
                borderRadius: 8,
              }}
              cursor={{ fill: 'var(--color-panel)' }}
            />
            <Bar dataKey="count" fill="var(--color-navy)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
