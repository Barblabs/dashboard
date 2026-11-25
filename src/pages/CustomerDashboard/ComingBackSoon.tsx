import { useTranslation } from 'react-i18next'
import { useClosedFindingsQuery, type ClosedFinding } from '../../api/findingCloses'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Card, CardHeader } from '../../components/ui/Card'
import { Message } from '../../components/ui/Message'
import { useDateFormat } from '../../i18n/format'

const WINDOW_DAYS = 30
const SHOWN = 3

type Returning = Extract<ClosedFinding, { reopen_at: string }>

function returningSoon(closed: ClosedFinding[]): Returning[] {
  const now = Date.now()
  const until = now + WINDOW_DAYS * 24 * 60 * 60 * 1000
  const inWindow = (at: number) => at > now && at <= until
  return closed
    .flatMap((f) => (f.reopen_at !== null && inWindow(new Date(f.reopen_at).getTime()) ? [f] : []))
    .toSorted((a, b) => new Date(a.reopen_at).getTime() - new Date(b.reopen_at).getTime())
}

export function ComingBackSoon() {
  const { t } = useTranslation()
  const query = useClosedFindingsQuery()
  return (
    <Card aria-label={t('dashboard.comingBack.title')}>
      <CardHeader title={t('dashboard.comingBack.title')} />
      <QueryBoundary
        query={query}
        keys={{
          loading: 'findings.closedList.loading',
          failed: 'findings.closedList.failed',
          network: 'findings.closedList.network',
        }}
      >
        {(closed) => <Returns findings={returningSoon(closed)} />}
      </QueryBoundary>
    </Card>
  )
}

function Returns({ findings }: { findings: Returning[] }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()

  if (findings.length === 0) return <Message>{t('dashboard.comingBack.none')}</Message>

  const more = findings.length - SHOWN
  return (
    <div className="flex flex-col gap-3 p-6">
      <ul className="flex flex-col gap-3">
        {findings.slice(0, SHOWN).map((f) => (
          <li key={f.id} className="flex flex-col gap-0.5">
            <span className="font-body text-[0.9375rem] text-navy [overflow-wrap:anywhere]">
              {t('dashboard.comingBack.finding', { cve: f.cve_id, asset: f.asset_name })}
            </span>
            <span className="font-body text-[0.8125rem] text-gray [overflow-wrap:anywhere]">
              {t('dashboard.comingBack.setAside', {
                reason: t(`findings.closeReasons.${f.reason}`),
                by: f.closed_by,
                date: formatDate(f.reopen_at),
              })}
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <span className="font-body text-[0.8125rem] text-gray">{t('dashboard.comingBack.more', { count: more })}</span>
      )}
    </div>
  )
}
