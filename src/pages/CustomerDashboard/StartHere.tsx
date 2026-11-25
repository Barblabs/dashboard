import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { currentScoreDetails, useCurrentOrderQuery, type CurrentOrder } from '../../api/prioritizations'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Card, CardHeader } from '../../components/ui/Card'
import { Message } from '../../components/ui/Message'

const TEXT_LINK = 'focus-ring rounded-sm font-body font-semibold text-nav-active-bg hover:underline'

export function StartHere() {
  const { t } = useTranslation()
  const query = useCurrentOrderQuery()
  return (
    <Card aria-label={t('dashboard.startHere.title')}>
      <CardHeader title={t('dashboard.startHere.title')} />
      <QueryBoundary
        query={query}
        keys={{ loading: 'findings.loading', failed: 'findings.failed', network: 'findings.network' }}
      >
        {(order) => (order ? <FirstGroups order={order} /> : <Message>{t('findings.empty')}</Message>)}
      </QueryBoundary>
    </Card>
  )
}

function FirstGroups({ order }: { order: CurrentOrder }) {
  const { t } = useTranslation()
  const { groups, findings } = order.prioritization
  const bands = new Map(findings.map((f) => [f.finding_id, currentScoreDetails(f).band]))

  return (
    <div className="flex flex-col gap-4 p-6">
      <ol className="flex flex-col gap-3">
        {groups.slice(0, 2).map((group) => (
          <li key={group.position} className="flex flex-col gap-0.5">
            <span className="font-body text-[0.9375rem] font-semibold text-navy">{group.title}</span>
            <span className="font-body text-[0.8125rem] text-gray">
              {t('dashboard.startHere.group', {
                count: group.finding_ids.length,
                critical: group.finding_ids.filter((id) => bands.get(id) === 'critical').length,
              })}
            </span>
          </li>
        ))}
      </ol>
      <Link to="/findings" className={`${TEXT_LINK} self-start text-[0.875rem]`}>
        {t('dashboard.startHere.openList')}
      </Link>
    </div>
  )
}
