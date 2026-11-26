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
import { Card, CardHeader } from '../../components/ui/Card'
import { TICK_STYLE, TOOLTIP_CURSOR, TOOLTIP_STYLE } from '../../components/ui/chart'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { Message } from '../../components/ui/Message'
import { STAT_CARD, STAT_LABEL, STAT_VALUE } from '../../components/ui/stat'
import { CARD_EDGE, HEADER_CELL, HEADER_ROW } from '../../components/ui/table'
import { useWideLayout } from '../../components/ui/useWideLayout'
import { useDateFormat, useDayFormat, useLocale, useRelativeTime } from '../../i18n/format'

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

// The term comes before its value, as a <dl> needs; the order classes show the figure first, as the Findings dashboard does.
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={STAT_CARD}>
      <dt className={`${STAT_LABEL} order-2`}>{label}</dt>
      <dd className={`${STAT_VALUE} order-1 text-navy`}>{value}</dd>
      {sub && <span className="order-3 font-body text-[0.75rem] text-gray">{sub}</span>}
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
  const statsQuery = useCustomersStatsQuery()
  const syncQuery = useSyncHealthQuery()

  return (
    <QueryBoundary query={statsQuery} keys={KEYS}>
      {(stats) => (
        <QueryBoundary query={syncQuery} keys={KEYS}>
          {(sync) => <StatsRow customers={stats.customers} days={sync.days} />}
        </QueryBoundary>
      )}
    </QueryBoundary>
  )
}

function StatsRow({ customers, days }: { customers: CustomerStats[]; days: SyncDay[] }) {
  const { t } = useTranslation()
  const active = customers.filter((c) => c.active).length
  const deactivated = customers.filter((c) => !c.active).length
  const usersTotal = customers.reduce((s, c) => s + c.user_count, 0)
  const cmdbN = customers.filter((c) => c.cmdb_connected).length
  const cmdbM = customers.length
  const failedSyncs = days.reduce((s, d) => s + d.failed, 0)

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
    <Card>
      <CardHeader title={t('adminDashboard.orgsTable.title')} help={t('adminDashboard.orgsTable.help')} />
      {customers.length === 0 ? (
        <Message>{t('tenants.empty')}</Message>
      ) : wide ? (
        <table className="w-full border-collapse font-body text-[0.875rem]">
          <thead>
            <tr className={HEADER_ROW}>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('adminDashboard.orgsTable.name')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('adminDashboard.orgsTable.status')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('adminDashboard.orgsTable.users')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('adminDashboard.orgsTable.cmdb')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('adminDashboard.orgsTable.lastSync')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-border-row hover:bg-row-hover">
                <td className={`px-4 py-3 font-semibold text-navy ${CARD_EDGE}`}>{c.name}</td>
                <td className={`px-4 py-3 ${CARD_EDGE}`}>
                  <OrgStatus customer={c} />
                </td>
                <td className={`px-4 py-3 tabular-nums text-gray ${CARD_EDGE}`}>{c.user_count}</td>
                <td className={`px-4 py-3 ${CARD_EDGE}`}>
                  <CmdbState customer={c} />
                </td>
                <td className={`px-4 py-3 ${CARD_EDGE}`}>
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
    </Card>
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
        className={`size-2 shrink-0 rounded-full ${customer.cmdb_connected ? 'bg-teal' : 'border border-muted-bg'}`}
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
        <span className="mt-0.5 block font-body text-[0.75rem] text-critical">
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
  const formatDay = useDayFormat()
  // Time runs left to right, whatever order the days come in.
  const shown = days.toSorted((a, b) => a.date.localeCompare(b.date))

  return (
    <Card>
      <CardHeader title={t('adminDashboard.syncChart.title')} help={t('adminDashboard.syncChart.help')} />
      <div className="p-6">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shown} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--color-border-row)" vertical={false} />
              <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={formatDay} />
              <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} labelFormatter={(day) => (typeof day === 'string' ? formatDay(day) : day)} />
              <Bar dataKey="succeeded" name={t('adminDashboard.syncChart.succeeded')} stackId="a" fill="var(--color-navy)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" name={t('adminDashboard.syncChart.failed')} stackId="a" fill="var(--color-critical)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
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
    <Card>
      <CardHeader title={t('adminDashboard.slack.title')} help={t('adminDashboard.slack.help')} />
      <ul className="flex flex-col gap-4 p-6">
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
                className="relative h-2.5 overflow-hidden rounded-full bg-panel"
                style={{ width: `${(row.total / maxTotal) * 100}%` }}
              >
                {(
                  [
                    { key: 'sent', color: 'var(--color-navy)', count: row.sent },
                    { key: 'failed', color: 'var(--color-critical)', count: row.failed },
                    // Waiting is not a risk level, so it takes a neutral rather than a severity colour.
                    { key: 'pending', color: 'var(--color-muted-bg)', count: row.pending },
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
    </Card>
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
    <Card>
      <CardHeader title={t('adminDashboard.chart.title')} help={t('adminDashboard.chart.help')} />
      <div className="p-6">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--color-border-row)" vertical={false} />
              <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} />
              <Bar dataKey="count" fill="var(--color-navy)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
