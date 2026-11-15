import { useTranslation } from 'react-i18next'
import type { ScoreBand } from '../../api/prioritizations'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'

const BAND_VARIANTS = {
  critical: 'critical',
  high: 'warning',
  medium: 'caution',
  low: 'muted',
} as const satisfies Record<ScoreBand, BadgeVariant>

/** The Score Band the backend gave; none before Scoring Model 3, which has no Bands. */
export function ScoreBandBadge({ band, className }: { band: ScoreBand | null; className?: string }) {
  const { t } = useTranslation()
  if (band === null) return null
  return (
    <Badge variant={BAND_VARIANTS[band]} className={className}>
      {t(`findings.detail.score.band.${band}`)}
    </Badge>
  )
}
