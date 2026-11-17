import { useTranslation } from 'react-i18next'
import { useFindingsSummaryQuery } from '../../api/findingsSummary'

interface CardProps {
  label: string
  value: number | undefined
  color?: string
}

function IndicatorCard({ label, value, color = 'text-navy' }: CardProps) {
  return (
    <div className="flex min-w-[8rem] flex-1 flex-col gap-1 rounded-xl border border-border-panel bg-white p-4">
      <span className={`font-title text-[1.75rem] font-bold leading-none ${color}`}>
        {value ?? '—'}
      </span>
      <span className="font-body text-[0.8125rem] text-gray">{label}</span>
    </div>
  )
}

export function SummaryIndicators() {
  const { t } = useTranslation()
  const { data } = useFindingsSummaryQuery()

  return (
    <div className="flex flex-wrap gap-3">
      <IndicatorCard label={t('findings.indicators.open')} value={data?.open} />
      <IndicatorCard
        label={t('findings.indicators.critical')}
        value={data?.critical}
        color="text-critical"
      />
      <IndicatorCard
        label={t('findings.indicators.high')}
        value={data?.high}
        color="text-high"
      />
      <IndicatorCard
        label={t('findings.indicators.kev')}
        value={data?.kev}
        color="text-critical"
      />
      <IndicatorCard
        label={t('findings.indicators.criticalInternetFacing')}
        value={data?.critical_internet_facing}
        color="text-critical"
      />
    </div>
  )
}
