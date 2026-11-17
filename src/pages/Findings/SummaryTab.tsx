import { useTranslation } from 'react-i18next'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTimeToCloseQuery, useWeeklyTrendQuery } from '../../api/findingsTrend'
import { QueryBoundary } from '../../components/QueryBoundary'

const CHART_STYLE = {
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  borderColor: 'var(--color-border-panel)',
  borderRadius: 8,
}

const TICK_STYLE = {
  fontSize: 12,
  fill: 'var(--color-gray)',
  fontFamily: 'var(--font-body)',
}

export function SummaryTabContent() {
  const { t } = useTranslation()
  const trendQuery = useWeeklyTrendQuery()
  const ttcQuery = useTimeToCloseQuery()

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border-panel bg-white p-6">
        <h2 className="mb-4 font-title text-[1rem] text-navy">{t('findings.resumen.trendTitle')}</h2>
        <QueryBoundary
          query={trendQuery}
          keys={{
            loading: 'findings.resumen.loading',
            failed: 'findings.resumen.failed',
            network: 'findings.resumen.network',
          }}
        >
          {(data) => <TrendChart weeks={data.weeks} />}
        </QueryBoundary>
      </section>

      <section className="rounded-xl border border-border-panel bg-white">
        <div className="border-b border-border-panel px-6 py-4">
          <h2 className="font-title text-[1rem] text-navy">{t('findings.resumen.ttcTitle')}</h2>
        </div>
        <QueryBoundary
          query={ttcQuery}
          keys={{
            loading: 'findings.resumen.loading',
            failed: 'findings.resumen.failed',
            network: 'findings.resumen.network',
          }}
        >
          {(data) => <TimeToCloseChart bands={data.bands} />}
        </QueryBoundary>
      </section>
    </div>
  )
}

type TrendPoint = { week: string; opened: number; closed: number; backlog: number }

function TrendChart({ weeks }: { weeks: TrendPoint[] }) {
  const { t } = useTranslation()

  const data = weeks.map((w) => ({
    ...w,
    label: formatWeekLabel(w.week),
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 32, bottom: 0, left: -16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-panel)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="count"
            allowDecimals={false}
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="backlog"
            orientation="right"
            allowDecimals={false}
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: 'var(--color-panel)' }} />
          <Legend
            wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 13 }}
            formatter={(value: string) => {
              if (value === 'opened') return t('findings.resumen.trendOpened')
              if (value === 'closed') return t('findings.resumen.trendClosed')
              if (value === 'backlog') return t('findings.resumen.trendBacklog')
              return value
            }}
          />
          <Bar
            yAxisId="count"
            dataKey="opened"
            fill="var(--color-high)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="count"
            dataKey="closed"
            fill="var(--color-navy)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="backlog"
            type="monotone"
            dataKey="backlog"
            stroke="var(--color-critical)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

type BandPoint = { band: string; median_days: number; count: number }

const BAND_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-high)',
  medium: 'var(--color-medium)',
  low: 'var(--color-low)',
  unbanded: 'var(--color-gray)',
}

function TimeToCloseChart({ bands }: { bands: BandPoint[] }) {
  const { t } = useTranslation()

  const bandLabels: Record<string, string> = {
    critical: t('findings.filter.bandValues.critical'),
    high: t('findings.filter.bandValues.high'),
    medium: t('findings.filter.bandValues.medium'),
    low: t('findings.filter.bandValues.low'),
    unbanded: t('findings.filter.bandValues.unbanded'),
  }

  if (bands.length === 0) {
    return (
      <p className="py-8 text-center font-body text-[0.875rem] text-gray">
        {t('findings.resumen.ttcNoData')}
      </p>
    )
  }

  const maxDays = Math.max(...bands.map((b) => b.median_days))

  return (
    <ul className="flex flex-col gap-4 p-6">
      {bands.map((row) => {
        const label = bandLabels[row.band] ?? row.band
        const days = row.median_days.toFixed(1)
        const unit = t('findings.resumen.ttcDays')
        return (
          <li key={row.band} className="flex items-center gap-3 font-body text-[0.875rem]">
            <span className="flex w-24 shrink-0 items-center justify-end gap-1.5 text-right text-gray">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: BAND_DOT_COLORS[row.band] ?? 'var(--color-gray)' }}
              />
              {label}
            </span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-panel">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-navy"
                style={{ width: `${(row.median_days / maxDays) * 100}%` }}
                role="img"
                aria-label={`${label}: ${days} ${unit}`}
              />
            </div>
            <span className="w-16 shrink-0 tabular-nums text-navy">
              {days} {unit}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function formatWeekLabel(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  return `${Number(m)}/${Number(d)}`
}
