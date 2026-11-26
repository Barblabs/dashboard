import { useTranslation } from 'react-i18next'
import { useWeeklyTrendQuery, type WeeklyTrendPoint } from '../../api/findingsTrend'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Card, CardHeader } from '../../components/ui/Card'
import { Message } from '../../components/ui/Message'
import { useDayFormat } from '../../i18n/format'
import { fromFirstRecord } from '../Findings/weeks'

export function BacklogLine() {
  const query = useWeeklyTrendQuery()
  return (
    <Card>
      <QueryBoundary
        query={query}
        keys={{ loading: 'dashboard.loading', failed: 'dashboard.failed', network: 'dashboard.network' }}
      >
        {(data) => <Backlog weeks={fromFirstRecord(data.weeks)} />}
      </QueryBoundary>
    </Card>
  )
}

function Backlog({ weeks }: { weeks: WeeklyTrendPoint[] }) {
  const { t } = useTranslation()
  const formatDay = useDayFormat()

  const first = weeks.at(0)
  const last = weeks.at(-1)
  if (first === undefined || last === undefined || weeks.length < 2) {
    return <Message>{t('dashboard.backlog.tooShort')}</Message>
  }

  const values = weeks.map((w) => w.open_at_end)
  const highest = Math.max(...values)
  const highestAt = values.indexOf(highest)
  const lastAt = values.length - 1
  const direction =
    last.open_at_end < first.open_at_end ? 'shrinking' : last.open_at_end > first.open_at_end ? 'growing' : 'steady'

  const x = (i: number) => (i / lastAt) * 100
  const y = (value: number) => 100 - (value / Math.max(highest, 1)) * 100
  const labelled = [...new Set([0, highestAt, lastAt])]

  return (
    <>
      <CardHeader title={t(`dashboard.backlog.${direction}`)} />
      <div
        role="img"
        aria-label={t('dashboard.backlog.chart', {
          start: formatDay(first.starts_on),
          first: first.open_at_end,
          highest,
          last: last.open_at_end,
        })}
        className="px-10 pt-10 pb-6"
      >
        <div className="relative h-32">
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke="var(--color-teal)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {labelled.map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal"
              style={{ left: `${x(i)}%`, top: `${y(values[i] ?? 0)}%` }}
            />
          ))}
          {labelled.map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] font-body text-[0.8125rem] font-semibold text-navy tabular-nums"
              style={{ left: `${x(i)}%`, top: `${y(values[i] ?? 0)}%` }}
            >
              {values[i]}
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="mt-2 flex justify-between font-body text-[0.8125rem] text-gray">
          <span>{formatDay(first.starts_on)}</span>
          <span>{t('dashboard.backlog.now')}</span>
        </div>
      </div>
    </>
  )
}
