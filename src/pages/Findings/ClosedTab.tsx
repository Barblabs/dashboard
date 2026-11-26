import { useTranslation } from 'react-i18next'
import { useClosedFindingsQuery, type ClosedFinding } from '../../api/findingCloses'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Message } from '../../components/ui/Message'
import { CELL, HEADER_CELL, HEADER_ROW } from '../../components/ui/table'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { useWideLayout } from '../../components/ui/useWideLayout'
import { useDateFormat } from '../../i18n/format'
import { reopenPassed, useReopensText } from './reopens'
import { ReopenFindingDialog, type FindingRef } from './FindingCloseDialogs'
import { MONO, WRITTEN } from './styles'

/** The Findings Users closed by hand, each with why and who, to reopen one. */
export function ClosedTabContent() {
  const { t } = useTranslation()
  const query = useClosedFindingsQuery()
  const reopenDialog = useDialogTarget<FindingRef>()

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-[0.875rem] text-gray">{t('findings.closedList.intro')}</p>
      <QueryBoundary
        query={query}
        keys={{ loading: 'findings.closedList.loading', failed: 'findings.closedList.failed', network: 'findings.closedList.network' }}
      >
        {(closed) =>
          closed.length === 0 ? (
            <Message>{t('findings.closedList.empty')}</Message>
          ) : (
            <ClosedList closed={closed} onReopen={reopenDialog.show} />
          )
        }
      </QueryBoundary>
      <ReopenFindingDialog dialog={reopenDialog} />
    </div>
  )
}

interface ListProps {
  closed: ClosedFinding[]
  onReopen: (finding: FindingRef) => void
}

function ClosedList({ closed, onReopen }: ListProps) {
  const { t } = useTranslation()
  const wide = useWideLayout()

  if (!wide) {
    return (
      <ul className="flex flex-col gap-3">
        {closed.map((finding) => (
          <ClosedCard key={finding.id} finding={finding} onReopen={onReopen} />
        ))}
      </ul>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border-panel bg-white px-2 py-1">
      <table className="w-full border-collapse text-[0.875rem]">
        <thead>
          <tr className={HEADER_ROW}>
            <th className={HEADER_CELL}>{t('findings.columns.cve')}</th>
            <th className={HEADER_CELL}>
              {t('findings.columns.asset')} · {t('findings.columns.component')}
            </th>
            <th className={HEADER_CELL}>{t('findings.closedList.reason')}</th>
            <th className={HEADER_CELL}>{t('findings.why.label')}</th>
            <th className={HEADER_CELL}>{t('findings.closedList.closed')}</th>
            <th className={HEADER_CELL}>{t('findings.closedList.reopensOn')}</th>
            <th className={HEADER_CELL}>
              <span className="sr-only">{t('findings.closedList.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {closed.map((finding) => (
            <ClosedRow key={finding.id} finding={finding} onReopen={onReopen} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface ItemProps {
  finding: ClosedFinding
  onReopen: (finding: FindingRef) => void
}

function ClosedRow({ finding, onReopen }: ItemProps) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  return (
    <tr className="hover:bg-row-hover">
      <td className={`${CELL} ${MONO} whitespace-nowrap`}>{finding.cve_id}</td>
      <td className={CELL}>
        <span className="flex flex-col gap-0.5">
          <span className="whitespace-nowrap">{finding.asset_name}</span>
          <span className={`${MONO} text-gray`}>
            {finding.component_name} {finding.component_version}
          </span>
        </span>
      </td>
      <td className={CELL}>
        <Badge variant="muted">{t(`findings.closeReasons.${finding.reason}`)}</Badge>
      </td>
      <td className={`${CELL} min-w-[8rem] max-w-[20rem]`}>
        <p className={WRITTEN}>{finding.note}</p>
      </td>
      <td className={CELL}>
        <span className="flex flex-col gap-0.5">
          {/* An email has no spaces to wrap at; it may break anywhere rather than push Reopen off the panel. */}
          <span className="[overflow-wrap:anywhere]">{finding.closed_by}</span>
          <span className="text-[0.75rem] text-gray">{formatDate(finding.closed_at)}</span>
        </span>
      </td>
      <td className={`${CELL} whitespace-nowrap`}>
        {finding.reopen_at !== null &&
          (reopenPassed(finding.reopen_at)
            ? t('findings.closedByHand.reopensNextSync')
            : formatDate(finding.reopen_at))}
      </td>
      <td className={CELL}>
        <ReopenButton finding={finding} onReopen={onReopen} />
      </td>
    </tr>
  )
}

function ClosedCard({ finding, onReopen }: ItemProps) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const reopensText = useReopensText()
  const reopens = reopensText(finding)
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border-panel bg-white p-4 text-[0.875rem] text-navy">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`${MONO} font-semibold whitespace-nowrap`}>{finding.cve_id}</span>
        <Badge variant="muted">{t(`findings.closeReasons.${finding.reason}`)}</Badge>
      </div>
      <div className="flex flex-col gap-0.5">
        <span>{finding.asset_name}</span>
        <span className={`${MONO} text-gray`}>
          {finding.component_name} {finding.component_version}
        </span>
      </div>
      <p className={WRITTEN}>{finding.note}</p>
      <span className="text-[0.75rem] text-gray">
        {t('findings.closedByHand.by', { by: finding.closed_by, date: formatDate(finding.closed_at) })}
      </span>
      {reopens && <span className="text-[0.75rem] text-gray">{reopens}</span>}
      <div>
        <ReopenButton finding={finding} onReopen={onReopen} />
      </div>
    </li>
  )
}

function ReopenButton({ finding, onReopen }: ItemProps) {
  const { t } = useTranslation()
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={t('findings.reopen.actionFor', { cve: finding.cve_id })}
      onClick={() => onReopen({ id: finding.id, cve: finding.cve_id })}
    >
      {t('findings.reopen.action')}
    </Button>
  )
}
