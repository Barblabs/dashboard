import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCustomersQuery, type CustomerResponse } from '../../api/customers'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { useDateFormat, useLocale } from '../../i18n/format'

function getMonthlyData(customers: CustomerResponse[], locale: string, now: Date) {
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'short' })
  const months: { label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const count = customers.filter((c) => c.created_at.startsWith(prefix)).length
    months.push({
      label: monthLabel.format(date),
      count,
    })
  }
  return months
}

// Computed once at module load. For a "this month" stat the page is remounted before the month turns.
const TODAY = new Date()
const THIS_MONTH = TODAY.toISOString().slice(0, 7)

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-panel bg-white p-5">
      <span className="font-body text-[0.8125rem] font-semibold uppercase tracking-wider text-gray">
        {label}
      </span>
      <span className="font-title text-[2rem] font-black leading-none text-navy">{value}</span>
    </div>
  )
}

const KEYS = {
  loading: 'adminDashboard.loading',
  failed: 'adminDashboard.loadFailed',
  network: 'adminDashboard.networkError',
} as const

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const customersQuery = useCustomersQuery()

  return (
    <Page title={t('adminDashboard.title')}>
      <QueryBoundary query={customersQuery} keys={KEYS}>
        {({ customers }) => <Dashboard customers={customers} />}
      </QueryBoundary>
    </Page>
  )
}

function Dashboard({ customers }: { customers: CustomerResponse[] }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const formatDate = useDateFormat('numeric')

  const { active, deactivated, newThisMonth, chartData, recent } = useMemo(
    () => ({
      active: customers.filter((c) => c.deactivated_at === null).length,
      deactivated: customers.filter((c) => c.deactivated_at !== null).length,
      newThisMonth: customers.filter((c) => c.created_at.startsWith(THIS_MONTH)).length,
      chartData: getMonthlyData(customers, locale, TODAY),
      recent: customers.toSorted((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    }),
    [customers, locale],
  )

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('adminDashboard.stats.total')} value={customers.length} />
        <StatCard label={t('adminDashboard.stats.active')} value={active} />
        <StatCard label={t('adminDashboard.stats.deactivated')} value={deactivated} />
        <StatCard label={t('adminDashboard.stats.newThisMonth')} value={newThisMonth} />
      </div>

      {/* Bar chart */}
      <section className="rounded-xl border border-border-panel bg-white p-6">
        <h2 className="mb-4 font-title text-[1rem] font-black text-navy">
          {t('adminDashboard.chart.title')}
        </h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9E1E8" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#637180', fontFamily: 'var(--font-body)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#637180', fontFamily: 'var(--font-body)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  borderColor: '#D9E1E8',
                  borderRadius: 8,
                }}
                cursor={{ fill: '#F4F7FA' }}
              />
              <Bar dataKey="count" fill="#0F385B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent organizations */}
      <section className="rounded-xl border border-border-panel bg-white">
        <div className="border-b border-border-panel px-6 py-4">
          <h2 className="font-title text-[1rem] font-black text-navy">
            {t('adminDashboard.recent.title')}
          </h2>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-center font-body text-[0.875rem] text-gray">
            {t('adminDashboard.recent.empty')}
          </p>
        ) : (
          <ul>
            {recent.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 border-b border-border-panel px-6 py-3 last:border-0"
              >
                <span className="font-body text-[0.9375rem] text-navy">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-body text-[0.8125rem] text-gray">
                    {formatDate(c.created_at)}
                  </span>
                  <Badge variant={c.deactivated_at ? 'muted' : 'outline'}>
                    {c.deactivated_at
                      ? t('tenants.status.deactivated').split(' ·')[0]
                      : t('tenants.status.active')}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Platform-admin notice */}
      <Alert tone="info">{t('adminDashboard.notice')}</Alert>
    </>
  )
}
