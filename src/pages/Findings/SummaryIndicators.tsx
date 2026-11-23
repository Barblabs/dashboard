import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useFindingsSummaryQuery } from '../../api/findingsSummary'

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
      className="flex min-w-[8rem] flex-1 flex-col gap-1 rounded-xl border border-border-panel bg-white p-4 transition-colors duration-150 hover:border-navy focus-visible:outline-2 focus-visible:outline-cyan"
    >
      <span className={`font-title text-[1.75rem] font-bold leading-none ${valueColor}`}>
        {value ?? '—'}
      </span>
      <span className="font-body text-[0.8125rem] text-gray">{label}</span>
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
