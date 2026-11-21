import { useTranslation } from 'react-i18next'
import { useClosedFindingsQuery, type ClosedFinding } from '../../api/findingCloses'
import type { Finding } from '../../api/prioritizations'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CheckIcon, RestoreIcon } from '../../components/ui/icons'
import { useDateFormat } from '../../i18n/format'
import type { FindingRef } from './FindingCloseDialogs'
import { useReopensText } from './reopens'
import { WRITTEN } from './styles'

/*
 * How a Finding stands, for closing or reopening it. The Prioritization only says whether it
 * is closed: the list of those closed by hand tells a close by hand from one on its own, which
 * only a match reopens. While that list is loading, or if it fails, nothing is claimed.
 */
type HandClose =
  | { kind: 'open' }
  | { kind: 'byHand'; close: ClosedFinding }
  | { kind: 'onItsOwn' }
  | { kind: 'unknown' }

function useHandClose(finding: Finding): HandClose {
  const closed = finding.closed_at !== null
  const query = useClosedFindingsQuery({ enabled: closed })
  if (!closed) return { kind: 'open' }
  if (!query.isSuccess) return { kind: 'unknown' }
  const close = query.data.find((c) => c.id === finding.finding_id)
  return close ? { kind: 'byHand', close } : { kind: 'onItsOwn' }
}

interface ActionProps {
  finding: Finding
  onCloseFinding: (finding: FindingRef) => void
  onReopenFinding: (finding: FindingRef) => void
}

/** Close for an open Finding, Reopen for one closed by hand, and nothing for one closed on its own. */
export function CloseAction({ finding, onCloseFinding, onReopenFinding }: ActionProps) {
  const { t } = useTranslation()
  const status = useHandClose(finding)
  const ref = { id: finding.finding_id, cve: finding.cve_id }
  switch (status.kind) {
    case 'open':
      return (
        <Button size="sm" className="inline-flex items-center gap-2" onClick={() => onCloseFinding(ref)}>
          <CheckIcon size={13} />
          {t('findings.close.action')}
        </Button>
      )
    case 'byHand':
      return (
        <Button size="sm" className="inline-flex items-center gap-2" onClick={() => onReopenFinding(ref)}>
          <RestoreIcon size={14} />
          {t('findings.reopen.action')}
        </Button>
      )
    default:
      return null
  }
}

/** Who closed the Finding by hand, why and until when; or that it closed on its own. */
export function CloseNote({ finding }: { finding: Finding }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const reopensText = useReopensText()
  const status = useHandClose(finding)

  if (status.kind === 'onItsOwn') {
    return <p className="font-body text-[0.875rem] leading-[1.4] text-gray">{t('findings.closedByHand.onItsOwn')}</p>
  }
  if (status.kind !== 'byHand') return null
  const { close } = status
  const reopens = reopensText(close)
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border-panel bg-white p-3">
      <span>
        <Badge variant="muted">{t(`findings.closeReasons.${close.reason}`)}</Badge>
      </span>
      <p className={`${WRITTEN} text-navy`}>{close.note}</p>
      <p className="font-body text-[0.75rem] text-gray">
        {t('findings.closedByHand.by', { by: close.closed_by, date: formatDate(close.closed_at) })}
      </p>
      {reopens && <p className="font-body text-[0.75rem] text-gray">{reopens}</p>}
    </div>
  )
}
