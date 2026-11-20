import { useTranslation } from 'react-i18next'
import type { ClosedFinding } from '../../api/findingCloses'
import { useDateFormat } from '../../i18n/format'

/** A past day waits for the next Sync, since no timer reopens the Finding (ADR 0035). */
function reopenPassed(reopenAt: string): boolean {
  return new Date(reopenAt).getTime() <= Date.now()
}

/** When a close until a day ends. */
export function useReopensText(): (close: ClosedFinding) => string | null {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  return (close) => {
    if (close.reopen_at === null) return null
    return reopenPassed(close.reopen_at)
      ? t('findings.closedByHand.reopensNextSync')
      : t('findings.closedByHand.reopensOn', { date: formatDate(close.reopen_at) })
  }
}
