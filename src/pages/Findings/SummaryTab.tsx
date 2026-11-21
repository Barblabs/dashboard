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
import type { CloseTimeBand, WeeklyTrendPoint } from '../../api/findingsTrend'
import { useTimeToCloseQuery, useWeeklyTrendQuery } from '../../api/findingsTrend'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { QueryBoundary } from '../../components/QueryBoundary'
import { isOneOf } from '../../api/schemas'
import { BAND_COLORS, BANDS } from './bands'
import { fromFirstRecord } from './weeks'

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
      <ChartErrorBoundary>
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
      </ChartErrorBoundary>

      <ChartErrorBoundary>
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
      </ChartErrorBoundary>
    </div>
  )
}

function TrendChart({ weeks }: { weeks: WeeklyTrendPoint[] }) {
  const { t } = useTranslation()

  const shown = fromFirstRecord(weeks)
  if (shown.length === 0) {
    return <p className="py-8 text-center font-body text-[0.875rem] text-gray">{t('findings.resumen.trendNoData')}</p>
  }
  const data = shown.map((w) => ({
    ...w,
    label: formatWeekLabel(w.starts_on),
  }))

  return (
    <div className="flex flex-col gap-3">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 32, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-panel)" vertical={false} />
            <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis yAxisId="count" allowDecimals={false} tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="backlog"
              orientation="right"
              allowDecimals={false}
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: 'var(--color-panel)' }} />
            {/* Each series carries its translated name, which the legend and the tooltip show. */}
            <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 13 }} />
            <Bar
              yAxisId="count"
              dataKey="opened"
              name={t('findings.resumen.trendOpened')}
              fill="var(--color-high)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="count"
              dataKey="closed"
              name={t('findings.resumen.trendClosed')}
              fill="var(--color-navy)"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="backlog"
              type="monotone"
              dataKey="open_at_end"
              name={t('findings.resumen.trendBacklog')}
              // Red reads as Critical everywhere else.
              stroke="var(--color-teal)"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="font-body text-[0.875rem] leading-[1.5] text-gray">{t('findings.resumen.trendBacklogHelp')}</p>
    </div>
  )
}

function TimeToCloseChart({ bands }: { bands: CloseTimeBand[] }) {
  const { t } = useTranslation()

  // A Finding with no risk level has nothing to compare its time with.
  const rows = bands.filter((b) => b.band !== 'unbanded')

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center font-body text-[0.875rem] text-gray">
        {t('findings.resumen.ttcNoData')}
      </p>
    )
  }

  const maxDays = Math.max(...rows.map((b) => b.median_days ?? 0), 1)
  const unit = t('findings.resumen.ttcDays')

  return (
    <ul className="flex flex-col gap-4 p-6">
      {rows.map((row) => {
        const band = isOneOf(BANDS, row.band) ? row.band : null
        const label = band ? t(`findings.filter.bandValues.${band}`) : row.band
        return (
          <li key={row.band} className="flex items-center gap-3 font-body text-[0.875rem]">
            <span className="flex w-24 shrink-0 items-center justify-end gap-1.5 text-right text-gray">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: band ? BAND_COLORS[band] : 'var(--color-gray)' }}
              />
              {label}
            </span>
            {row.median_days !== null ? (
              <>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-panel">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-navy"
                    style={{ width: `${(row.median_days / maxDays) * 100}%` }}
                    role="img"
                    aria-label={`${label}: ${row.median_days.toFixed(1)} ${unit}`}
                  />
                </div>
                <span className="w-16 shrink-0 tabular-nums text-navy">
                  {row.median_days.toFixed(1)} {unit}
                </span>
              </>
            ) : (
              <>
                <span className="flex-1 font-body text-[0.75rem] italic text-gray">
                  {t('findings.resumen.ttcNone')}
                </span>
                <span className="w-16 shrink-0 text-gray">—</span>
              </>
            )}
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
