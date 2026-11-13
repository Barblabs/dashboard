import { useTranslation } from 'react-i18next'
import {
  currentScore,
  placedByNewest,
  scoreMoved,
  type CurrentOrder,
  type Finding,
  type PriorityGroup,
} from '../../api/prioritizations'
import { Badge } from '../../components/ui/Badge'
import { Panel, PanelTitle } from '../../components/ui/Panel'
import { CELL, HEADER_CELL } from '../../components/ui/table'
import { MONO, WRITTEN } from './styles'

interface Props {
  order: CurrentOrder
  group: PriorityGroup
  onOpen: (findingId: string) => void
}

export function GroupPanel({ order, group, onOpen }: Props) {
  const { t } = useTranslation()
  const findings = group.finding_ids
    .map((id) => order.prioritization.findings.find((f) => f.finding_id === id))
    .filter((f): f is Finding => f !== undefined)

  return (
    <Panel role="region" className="gap-4" aria-labelledby={`group-${group.position}`}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="solid">{t('findings.group.position', { position: group.position })}</Badge>
          <PanelTitle id={`group-${group.position}`}>{group.title}</PanelTitle>
          <span className="font-body text-[0.8125rem] text-gray">
            {t('findings.group.size', { count: findings.length })}
          </span>
        </div>
        <p className={`${WRITTEN} max-w-[60rem] text-gray`}>{group.reason}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.875rem]">
          <thead>
            <tr className="border-b-2 border-border-row">
              <th className={HEADER_CELL}>{t('findings.columns.cve')}</th>
              <th className={HEADER_CELL}>{t('findings.columns.asset')}</th>
              <th className={HEADER_CELL}>{t('findings.columns.component')}</th>
              <th className={HEADER_CELL}>{t('findings.columns.score')}</th>
              <th className={HEADER_CELL} title={t('findings.scoreRankHelp')}>
                {t('findings.columns.scoreRank')}
              </th>
              <th className={HEADER_CELL}>{t('findings.columns.status')}</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => (
              <FindingRow key={finding.finding_id} order={order} finding={finding} onOpen={onOpen} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function FindingRow({ order, finding, onOpen }: { order: CurrentOrder; finding: Finding; onOpen: (id: string) => void }) {
  const { t } = useTranslation()
  const closed = finding.closed_at !== null

  return (
    <tr
      // The whole row is the mouse target; the button stays the keyboard and screen reader path.
      onClick={() => onOpen(finding.finding_id)}
      className={`cursor-pointer transition-colors duration-150 hover:bg-row-hover ${closed ? 'text-gray' : ''}`}
    >
      <td className={CELL}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpen(finding.finding_id)
          }}
          aria-label={t('findings.open', { cve: finding.cve_id })}
          className={`focus-ring cursor-pointer rounded-xs font-semibold underline-offset-2 hover:underline ${MONO} ${closed ? 'text-gray line-through' : 'text-navy'}`}
        >
          {finding.cve_id}
        </button>
      </td>
      <td className={CELL}>{finding.asset_name}</td>
      <td className={`${CELL} ${MONO}`}>
        {finding.component} {finding.version}
      </td>
      <td className={`${CELL} ${MONO}`}>
        {currentScore(finding)}
        {scoreMoved(finding) && (
          <span
            role="img"
            aria-label={t('findings.detail.score.moved')}
            title={t('findings.detail.score.moved')}
            className="ml-1.5 text-gray"
          >
            ↻
          </span>
        )}
      </td>
      <td className={`${CELL} ${MONO} text-gray`}>#{finding.score_rank}</td>
      <td className={CELL}>
        <FindingBadges order={order} finding={finding} />
      </td>
    </tr>
  )
}

export function FindingBadges({ order, finding }: { order: CurrentOrder; finding: Finding }) {
  const { t } = useTranslation()
  const { kev } = finding.details
  const hasPlan = order.prioritization.plans.some((p) => p.finding_id === finding.finding_id)

  return (
    <span className="flex flex-wrap gap-1.5">
      {finding.closed_at !== null && <Badge variant="muted">{t('findings.badges.closed')}</Badge>}
      {kev && <Badge variant="critical">{t('findings.badges.kev')}</Badge>}
      {kev?.known_ransomware_campaign_use === 'Known' && (
        <Badge variant="critical">{t('findings.badges.ransomware')}</Badge>
      )}
      {placedByNewest(order, finding) && (
        <Badge variant="caps" title={t('findings.badges.newHelp')}>{t('findings.badges.new')}</Badge>
      )}
      {hasPlan && <Badge variant="muted">{t('findings.badges.plan')}</Badge>}
    </span>
  )
}
