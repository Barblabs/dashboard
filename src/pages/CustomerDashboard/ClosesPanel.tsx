import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { closedCount, useClosedFindingsQuery, useFindingClosesQuery, type FindingCloses } from '../../api/findingCloses'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Card, CardHeader } from '../../components/ui/Card'
import { useDateFormat } from '../../i18n/format'
import { comingBackUntil, returningSoon } from './comingBack'

const BUCKETS = [
  { key: 'fixed', label: 'dashboard.closes.fixed', why: 'dashboard.closes.fixedWhy', colour: 'bg-navy text-white' },
  {
    key: 'went_away',
    label: 'dashboard.closes.wentAway',
    why: 'dashboard.closes.wentAwayWhy',
    colour: 'bg-gray-blue text-navy',
  },
  {
    key: 'set_aside',
    label: 'dashboard.closes.setAside',
    why: 'dashboard.closes.setAsideWhy',
    colour: 'bg-muted-bg text-navy',
  },
] as const

export function ClosesPanel() {
  const titleId = useId()
  const query = useFindingClosesQuery()
  return (
    <Card aria-labelledby={titleId}>
      <QueryBoundary
        query={query}
        keys={{ loading: 'dashboard.loading', failed: 'dashboard.failed', network: 'dashboard.network' }}
      >
        {(closes) => <Closes closes={closes} titleId={titleId} />}
      </QueryBoundary>
    </Card>
  )
}

function Closes({ closes: { current }, titleId }: { closes: FindingCloses; titleId: string }) {
  const { t } = useTranslation()
  const total = closedCount(current)

  if (total === 0) return <CardHeader id={titleId} title={t('dashboard.closes.none')} />

  return (
    <>
      <CardHeader id={titleId} title={t('dashboard.closes.title', { count: total })} />
      <div className="flex flex-col gap-4 p-6">
        <div className="flex h-8 gap-0.5 overflow-hidden rounded-md" aria-hidden="true">
          {BUCKETS.filter((b) => current[b.key] > 0).map((b) => (
            <span
              key={b.key}
              className={`flex min-w-8 basis-0 items-center justify-center font-body text-[0.8125rem] font-semibold tabular-nums ${b.colour}`}
              style={{ flexGrow: current[b.key] }}
            >
              {current[b.key]}
            </span>
          ))}
        </div>
        <ul className="flex flex-col gap-3">
          {BUCKETS.map((b) => (
            <li key={b.key} className="flex items-baseline gap-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${b.colour}`} aria-hidden="true" />
              <span className="w-8 shrink-0 font-title text-[1rem] text-navy tabular-nums">{current[b.key]}</span>
              <span className="flex flex-col gap-0.5 font-body text-[0.875rem] text-navy">
                <span>
                  <strong className="font-semibold">{t(b.label)}</strong>: {t(b.why)}
                </span>
                {b.key === 'set_aside' && <ComingBack />}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function ComingBack() {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const closed = useClosedFindingsQuery()
  const count = closed.data ? returningSoon(closed.data).length : 0
  if (count === 0) return null
  return (
    <span className="text-[0.8125rem] text-gray">
      {t('dashboard.closes.comeBack', { count, date: formatDate(new Date(comingBackUntil()).toISOString()) })}
    </span>
  )
}
