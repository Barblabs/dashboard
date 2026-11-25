import { useTranslation } from 'react-i18next'
import { useFindingClosesQuery, type FindingCloses } from '../../api/findingCloses'
import { useFindingsSummaryQuery } from '../../api/findingsSummary'
import { useWeeklyTrendQuery } from '../../api/findingsTrend'
import { STAT_CARD, STAT_LABEL, STAT_VALUE } from '../../components/ui/stat'
import { EMPTY } from '../../i18n/format'

const NOTE = 'font-body text-[0.8125rem]'

export function HeadlineCards() {
  const { t } = useTranslation()
  const summary = useFindingsSummaryQuery()
  const trend = useWeeklyTrendQuery()

  const open = summary.data?.open
  const critical = summary.data?.critical
  const weeks = trend.data?.weeks ?? []
  const lastMonday = weeks.at(-2)?.open_at_end
  const change = open !== undefined && lastMonday !== undefined ? open - lastMonday : undefined

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <section className={STAT_CARD} aria-label={t('dashboard.open.label')}>
        <span className={`${STAT_VALUE} text-navy`}>{open ?? EMPTY}</span>
        <span className={STAT_LABEL}>{t('dashboard.open.label')}</span>
        {change !== undefined && <OpenChange change={change} />}
      </section>
      <section className={STAT_CARD} aria-label={t('dashboard.critical.label')}>
        {critical === 0 ? (
          <span className={`${STAT_VALUE} text-navy`}>{t('dashboard.critical.none')}</span>
        ) : (
          <span className={`${STAT_VALUE} ${critical === undefined ? 'text-navy' : 'text-critical'}`}>
            {critical ?? EMPTY}
          </span>
        )}
        <span className={STAT_LABEL}>{t('dashboard.critical.label')}</span>
        {summary.data && summary.data.critical > 0 && (
          <span className={`${NOTE} text-navy`}>
            {t('dashboard.critical.internetFacing', { count: summary.data.critical_internet_facing })}
          </span>
        )}
      </section>
      <FixedCard />
    </div>
  )
}

function FixedCard() {
  const { t } = useTranslation()
  const closes = useFindingClosesQuery()
  return (
    <section className={STAT_CARD} aria-label={t('dashboard.fixed.label')}>
      <span className={`${STAT_VALUE} text-navy`}>{closes.data?.current.fixed ?? EMPTY}</span>
      <span className={STAT_LABEL}>{t('dashboard.fixed.label')}</span>
      {closes.data && <FixedChange closes={closes.data} />}
      {closes.data && closes.data.critical_fixed_median_days !== null && (
        <span className={`${NOTE} text-navy`}>
          {t('dashboard.fixed.criticalMedian', { count: Math.max(1, Math.ceil(closes.data.critical_fixed_median_days)) })}
        </span>
      )}
    </section>
  )
}

function FixedChange({ closes: { current, previous } }: { closes: FindingCloses }) {
  const { t } = useTranslation()
  const values = { previous: previous.fixed }
  if (current.fixed > previous.fixed) return <span className={`${NOTE} text-good`}>{t('dashboard.fixed.up', values)}</span>
  if (current.fixed < previous.fixed) return <span className={`${NOTE} text-critical`}>{t('dashboard.fixed.down', values)}</span>
  return <span className={`${NOTE} text-gray`}>{t('dashboard.fixed.same')}</span>
}

function OpenChange({ change }: { change: number }) {
  const { t } = useTranslation()
  if (change < 0) return <span className={`${NOTE} text-good`}>{t('dashboard.open.down', { count: -change })}</span>
  if (change > 0) return <span className={`${NOTE} text-critical`}>{t('dashboard.open.up', { count: change })}</span>
  return <span className={`${NOTE} text-gray`}>{t('dashboard.open.same')}</span>
}
