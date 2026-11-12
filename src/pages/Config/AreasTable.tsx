import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAreasQuery, type Area } from '../../api/areas'
import { ACTIVITY_FILTERS, type ActivityFilter } from '../../api/assets'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Badge } from '../../components/ui/Badge'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { useDateFormat } from '../../i18n/format'
import { AreaOwnerDialog } from './AreaOwnerDialog'
import { FilterSelect } from './FilterSelect'
import { pick } from './filters'
import { CELL, HEADER_CELL } from './table'
import { Message } from '../../components/ui/Message'

const DEFAULT_ACTIVITY: ActivityFilter = 'true'

const KEYS = {
  loading: 'config.areas.loading',
  failed: 'config.areas.loadFailed',
  network: 'config.areas.networkError',
} as const

function AreaStatus({ area }: { area: Area }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()

  if (area.active) return <Badge variant="outline">{t('config.areas.status.active')}</Badge>
  return (
    <Badge variant="muted">
      {area.inactive_since
        ? t('config.areas.status.inactiveSince', { date: formatDate(area.inactive_since) })
        : t('config.areas.status.inactive')}
    </Badge>
  )
}

const OWNER_ACTION =
  'cursor-pointer p-0 font-body text-[0.8125rem] whitespace-nowrap text-navy underline decoration-navy/30 underline-offset-2 transition-colors hover:decoration-navy focus-ring'

interface AreaRowsProps {
  areas: Area[]
  onEditOwner?: (area: Area) => void
}

function AreaRows({ areas, onEditOwner }: AreaRowsProps) {
  const { t } = useTranslation()

  return (
    <div className="animate-fade-in overflow-x-auto">
      <table className="w-full border-collapse text-[0.875rem]">
        <thead>
          <tr className="border-b-2 border-border-row">
            <th className={HEADER_CELL}>{t('config.areas.columns.area')}</th>
            <th className={HEADER_CELL}>{t('config.areas.columns.owner')}</th>
            <th className={HEADER_CELL}>{t('config.areas.columns.status')}</th>
            {onEditOwner && <th className={HEADER_CELL} />}
          </tr>
        </thead>
        <tbody>
          {areas.map((area) => (
            <tr
              key={area.id}
              className={`hover:bg-row-hover ${area.active ? '' : '*:opacity-50'}`}
            >
              <td className={CELL}>
                <span className="block font-medium">{area.name}</span>
                <span className="mt-0.5 block font-mono text-[0.6875rem] text-gray">
                  {area.record_id}
                </span>
              </td>
              <td className={CELL}>
                {area.owner_email ? (
                  <span className="font-mono text-[0.8125rem]">{area.owner_email}</span>
                ) : (
                  <span className="text-gray italic">{t('config.areas.noOwner')}</span>
                )}
              </td>
              <td className={CELL}>
                <AreaStatus area={area} />
              </td>
              {onEditOwner && (
                <td className={`${CELL} text-right`}>
                  <button type="button" className={OWNER_ACTION} onClick={() => onEditOwner(area)}>
                    {area.owner_email ? t('config.areas.owner.edit') : t('config.areas.owner.set')}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AreasTable({ readOnly }: { readOnly: boolean }) {
  const { t } = useTranslation()
  const [active, setActive] = useState<ActivityFilter>(DEFAULT_ACTIVITY)
  const ownerDialog = useDialogTarget<Area>()
  const query = useAreasQuery(active)

  return (
    <section>
      <div className="flex flex-col gap-4 border-b border-border-panel px-6 pt-5 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h2 className="font-title text-[1rem] text-navy">{t('config.areas.title')}</h2>
            {query.isSuccess && (
              <span className="font-body text-[0.8125rem] text-gray">
                {t('config.areas.total', { count: query.data.areas.length })}
              </span>
            )}
          </div>
          <p className="font-body text-[0.8125rem] text-gray">{t('config.areas.description')}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <FilterSelect
            label={t('config.areas.filter')}
            value={active}
            onChange={(value) => setActive(pick(ACTIVITY_FILTERS, value) ?? active)}
          >
            {ACTIVITY_FILTERS.map((activity) => (
              <option key={activity} value={activity}>
                {t(`config.areas.activity.${activity}`)}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      <QueryBoundary query={query} keys={KEYS}>
        {({ areas }) =>
          areas.length === 0 ? (
            <Message>
              {active === DEFAULT_ACTIVITY ? t('config.areas.empty') : t('config.areas.noMatches')}
            </Message>
          ) : (
            <AreaRows areas={areas} onEditOwner={readOnly ? undefined : ownerDialog.show} />
          )
        }
      </QueryBoundary>
      <AreaOwnerDialog dialog={ownerDialog} />
    </section>
  )
}
