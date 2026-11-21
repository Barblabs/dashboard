import { useTranslation } from 'react-i18next'
import { BAND_COLORS, BANDS, type Band } from './bands'

/** What each colour of a chart's bars means; only the risk levels the chart shows. */
export function BandLegend({ bands }: { bands: readonly Band[] }) {
  const { t } = useTranslation()
  const shown = BANDS.filter((b) => bands.includes(b))
  if (shown.length === 0) return null
  return (
    <ul aria-label={t('findings.filter.band')} className="flex flex-wrap gap-x-4 gap-y-1.5 font-body text-[0.875rem] text-gray">
      {shown.map((band) => (
        <li key={band} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: BAND_COLORS[band] }} />
          {t(`findings.filter.bandValues.${band}`)}
        </li>
      ))}
    </ul>
  )
}
