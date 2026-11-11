import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAreasQuery, type Area } from '../../api/areas'
import { ACTIVITY_FILTERS, type ActivityFilter } from '../../api/assets'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import { FilterSelect } from './AssetFilterBar'
import { CELL, HEADER_CELL, MESSAGE, useDateFormat } from './table'

const DEFAULT_ACTIVITY: ActivityFilter = 'true'

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

function AreaRows({ areas }: { areas: Area[] }) {
  const { t } = useTranslation()

  return (
    <div className="animate-fade-in overflow-x-auto">
      <table className="w-full border-collapse text-[0.875rem]">
        <thead>
          <tr className="border-b-2 border-border-row">
            <th className={HEADER_CELL}>{t('config.areas.columns.area')}</th>
            <th className={HEADER_CELL}>{t('config.areas.columns.owner')}</th>
            <th className={HEADER_CELL}>{t('config.areas.columns.status')}</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AreasTable() {
  const { t } = useTranslation()
  const [active, setActive] = useState<ActivityFilter>(DEFAULT_ACTIVITY)
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
            onChange={(value) =>
              setActive(ACTIVITY_FILTERS.find((option) => option === value) ?? active)
            }
          >
            {ACTIVITY_FILTERS.map((activity) => (
              <option key={activity} value={activity}>
                {t(`config.areas.activity.${activity}`)}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      {query.isPending ? (
        <div className={MESSAGE}>{t('config.areas.loading')}</div>
      ) : query.isError ? (
        <div role="alert" className={`${MESSAGE} flex flex-col items-center gap-3`}>
          {requestErrorText(query.error, t, {
            fallback: 'config.areas.loadFailed',
            network: 'config.areas.networkError',
          })}
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            {t('config.areas.retry')}
          </Button>
        </div>
      ) : query.data.areas.length === 0 ? (
        <div className={MESSAGE}>
          {active === DEFAULT_ACTIVITY ? t('config.areas.empty') : t('config.areas.noMatches')}
        </div>
      ) : (
        <AreaRows areas={query.data.areas} />
      )}
    </section>
  )
}
