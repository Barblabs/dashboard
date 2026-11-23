import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAreasQuery, type Area } from '../../api/areas'
import { ACTIVITY_FILTERS, type ActivityFilter } from '../../api/assets'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { useWideLayout } from '../../components/ui/useWideLayout'
import { useDateFormat } from '../../i18n/format'
import { AreaOwnerDialog } from './AreaOwnerDialog'
import { FilterSelect } from './FilterSelect'
import { pick } from './filters'
import { CELL, HEADER_CELL } from '../../components/ui/table'
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

interface AreaRowsProps {
  areas: Area[]
  onEditOwner?: (area: Area) => void
}

function AreaRows({ areas, onEditOwner }: AreaRowsProps) {
  const { t } = useTranslation()
  const wide = useWideLayout()

  if (!wide) {
    return (
      <ul className="flex animate-fade-in flex-col gap-3 p-4">
        {areas.map((area) => (
          <li
            key={area.id}
            className={`flex flex-col gap-3 rounded-lg border border-border-panel bg-white p-4 text-[0.875rem] text-navy ${area.active ? '' : '*:opacity-50'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <AreaName area={area} />
              </div>
              <AreaStatus area={area} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AreaOwner area={area} />
              {onEditOwner && <OwnerButton area={area} onEditOwner={onEditOwner} />}
            </div>
          </li>
        ))}
      </ul>
    )
  }

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
                <AreaName area={area} />
              </td>
              <td className={CELL}>
                <AreaOwner area={area} />
              </td>
              <td className={CELL}>
                <AreaStatus area={area} />
              </td>
              {onEditOwner && (
                <td className={`${CELL} text-right`}>
                  <OwnerButton area={area} onEditOwner={onEditOwner} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AreaName({ area }: { area: Area }) {
  return (
    <>
      <span className="block font-medium">{area.name}</span>
      <span className="mt-0.5 block font-mono text-[0.6875rem] text-gray">{area.record_id}</span>
    </>
  )
}

function AreaOwner({ area }: { area: Area }) {
  const { t } = useTranslation()

  return area.owner_email ? (
    <span className="min-w-0 font-mono text-[0.8125rem] wrap-anywhere">{area.owner_email}</span>
  ) : (
    <span className="text-gray italic">{t('config.areas.noOwner')}</span>
  )
}

function OwnerButton({ area, onEditOwner }: { area: Area; onEditOwner: (area: Area) => void }) {
  const { t } = useTranslation()

  return (
    <Button variant="link" size="sm" onClick={() => onEditOwner(area)}>
      {area.owner_email ? t('config.areas.owner.edit') : t('config.areas.owner.set')}
    </Button>
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
        <div className="flex items-baseline gap-3">
          <h2 className="font-title text-[1rem] text-navy">{t('config.areas.title')}</h2>
          {query.isSuccess && (
            <span className="font-body text-[0.8125rem] text-gray">
              {t('config.areas.total', { count: query.data.areas.length })}
            </span>
          )}
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
