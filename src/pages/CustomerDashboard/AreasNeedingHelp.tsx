import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAging, useAreaHealthQuery, type AreaHealth } from '../../api/areas'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CARD_EDGE, CELL, HEADER_CELL, HEADER_ROW } from '../../components/ui/table'
import { useListFormat } from '../../i18n/format'

const ROWS = 5

export function AreasNeedingHelp() {
  const titleId = useId()
  const query = useAreaHealthQuery()
  return (
    <Card aria-labelledby={titleId}>
      <QueryBoundary
        query={query}
        keys={{ loading: 'dashboard.loading', failed: 'dashboard.failed', network: 'dashboard.network' }}
      >
        {(areas) => <AreaTable areas={areas} titleId={titleId} />}
      </QueryBoundary>
    </Card>
  )
}

function AreaTable({ areas, titleId }: { areas: AreaHealth[]; titleId: string }) {
  const { t } = useTranslation()
  const formatList = useListFormat()
  const [expanded, setExpanded] = useState(false)

  const flagged = areas.filter((a) => a.needs_help).length
  const shown = expanded ? areas : areas.slice(0, Math.max(flagged, ROWS))
  const rest = areas.slice(shown.length)
  const most = Math.max(0, ...areas.map((a) => a.critical_open + a.high_open))
  const nameOf = (area: AreaHealth) => area.name ?? t('dashboard.areas.noArea')

  return (
    <>
      <div className="flex flex-col gap-1 border-b border-border-panel px-6 py-4">
        <h2 id={titleId} className="font-title text-[1rem] text-navy">
          {flagged === 0 ? t('dashboard.areas.none') : t('dashboard.areas.title', { count: flagged })}
        </h2>
        <p className="font-body text-[0.8125rem] text-gray">{t('dashboard.areas.rule')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-body text-[0.875rem]">
          <thead>
            <tr className={HEADER_ROW}>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('config.areas.columns.area')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('dashboard.areas.columns.criticalHigh')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE}`}>{t('dashboard.areas.columns.oldestCritical')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE} text-right`}>{t('dashboard.areas.columns.fixed')}</th>
              <th className={`${HEADER_CELL} ${CARD_EDGE} text-right`}>{t('dashboard.areas.columns.change')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((area) => (
              <AreaRow key={area.id ?? 'none'} area={area} name={nameOf(area)} most={most} />
            ))}
          </tbody>
        </table>
      </div>
      {rest.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-4 font-body text-[0.8125rem] text-gray">
          <span>
            {t('dashboard.areas.rest', {
              count: rest.length,
              names: formatList(rest.map(nameOf)),
            })}{' '}
            <Holding rest={rest} />
          </span>
          <Button variant="link" size="sm" className="font-semibold" onClick={() => setExpanded(true)}>
            {t('dashboard.areas.showAll', { count: areas.length })}
          </Button>
        </p>
      )}
    </>
  )
}

function Holding({ rest }: { rest: AreaHealth[] }) {
  const { t } = useTranslation()
  const high = rest.reduce((n, a) => n + a.high_open, 0)
  const critical = rest.reduce((n, a) => n + a.critical_open, 0)
  return critical === 0
    ? t('dashboard.areas.holdHigh', { count: high })
    : t('dashboard.areas.holdBoth', { high, critical })
}

function AreaRow({ area, name, most }: { area: AreaHealth; name: string; most: number }) {
  const { t } = useTranslation()
  const open = area.critical_open + area.high_open
  const change = area.open_now - area.open_30_days_ago

  return (
    <tr className={area.needs_help ? '' : 'opacity-60 contrast-more:opacity-100'}>
      <td className={`${CELL} ${CARD_EDGE}`}>
        <div className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{name}</span>
            {area.needs_help && <Badge variant="critical">{t('dashboard.areas.needsHelp')}</Badge>}
          </span>
          <span className="text-[0.8125rem] text-gray">
            {t('config.inventory.total', { count: area.asset_count })} ·{' '}
            {area.owner_email ?? t('config.areas.noOwner')}
          </span>
          {area.needs_help && <span className="text-[0.8125rem] text-critical"><Reason area={area} /></span>}
        </div>
      </td>
      <td className={`${CELL} ${CARD_EDGE}`}>
        <div className="flex min-w-40 flex-col gap-1">
          <div className="h-2 w-full" aria-hidden="true">
            {open > 0 && (
              <div className="flex h-full gap-0.5 overflow-hidden rounded-sm" style={{ width: `${(open / most) * 100}%` }}>
                {area.critical_open > 0 && <span className="bg-critical" style={{ flexGrow: area.critical_open }} />}
                {area.high_open > 0 && <span className="bg-high" style={{ flexGrow: area.high_open }} />}
              </div>
            )}
          </div>
          <span className="text-[0.8125rem] whitespace-nowrap tabular-nums">
            {t('dashboard.areas.criticalHigh', { critical: area.critical_open, high: area.high_open })}
          </span>
        </div>
      </td>
      <td className={`${CELL} ${CARD_EDGE} whitespace-nowrap tabular-nums`}>
        {area.oldest_critical_days === null ? (
          t('dashboard.critical.none')
        ) : (
          <span className={isAging(area) ? 'font-semibold text-critical' : ''}>
            {t('dashboard.areas.days', { count: area.oldest_critical_days })}
          </span>
        )}
      </td>
      <td className={`${CELL} ${CARD_EDGE} text-right tabular-nums`}>{area.fixed}</td>
      <td className={`${CELL} ${CARD_EDGE} text-right whitespace-nowrap tabular-nums`}>
        {change > 0 && <span className="font-semibold text-critical">{t('dashboard.areas.up', { count: change })}</span>}
        {change < 0 && <span className="font-semibold text-good">{t('dashboard.areas.down', { count: -change })}</span>}
        {change === 0 && t('dashboard.areas.same')}
      </td>
    </tr>
  )
}

function Reason({ area }: { area: AreaHealth }) {
  const { t } = useTranslation()
  if (!isAging(area)) return t('dashboard.areas.reasons.growing')
  const count = area.oldest_critical_days
  return area.reasons.length === 2
    ? t('dashboard.areas.reasons.both', { count })
    : t('dashboard.areas.reasons.aging', { count })
}
