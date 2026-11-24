import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useFindingsSummaryQuery } from '../../api/findingsSummary'
import { STAT_CARD, STAT_LABEL, STAT_VALUE } from '../../components/ui/stat'

interface CardProps {
  label: string
  value: number | undefined
  color?: string
  to: string
}

function IndicatorCard({ label, value, color = 'text-navy', to }: CardProps) {
  const valueColor = value ? color : 'text-navy'
  return (
    <Link
      to={to}
      className={`${STAT_CARD} focus-ring min-w-[8rem] flex-1 transition-colors duration-150 hover:border-navy`}
    >
      <span className={`${STAT_VALUE} ${valueColor}`}>{value ?? '—'}</span>
      <span className={STAT_LABEL}>{label}</span>
    </Link>
  )
}

export function SummaryIndicators() {
  const { t } = useTranslation()
  const { data } = useFindingsSummaryQuery()

  return (
    <div className="flex flex-wrap gap-3">
      <IndicatorCard
        label={t('findings.indicators.open')}
        value={data?.open}
        to="/findings?status=open&from=dashboard"
      />
      <IndicatorCard
        label={t('findings.indicators.critical')}
        value={data?.critical}
        color="text-critical"
        to="/findings?band=critical&from=dashboard"
      />
      <IndicatorCard
        label={t('findings.indicators.high')}
        value={data?.high}
        color="text-high"
        to="/findings?band=high&from=dashboard"
      />
      <IndicatorCard
        label={t('findings.indicators.kev')}
        value={data?.kev}
        color="text-critical"
        to="/findings?kev=1&from=dashboard"
      />
      <IndicatorCard
        label={t('findings.indicators.criticalInternetFacing')}
        value={data?.critical_internet_facing}
        color="text-critical"
        to="/findings?band=critical&exposure=internet_facing&from=dashboard"
      />
    </div>
  )
}
