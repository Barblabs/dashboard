import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAreasQuery } from '../../api/areas'
import {
  ACTIVITY_FILTERS,
  ASSET_KINDS,
  CRITICALITY_FILTERS,
  type AssetFilters,
} from '../../api/assets'
import { FilterMultiSelect } from './FilterMultiSelect'
import { FilterSelect } from './FilterSelect'
import { pick, pickAll } from './filters'

export function AssetFilterBar({
  filters,
  onChange,
}: {
  filters: AssetFilters
  onChange: (filters: AssetFilters) => void
}) {
  const { t } = useTranslation()
  // Inactive Areas still hold Assets, so they stay choosable.
  const areas = useAreasQuery('all')
  const kindOptions = useMemo(
    () => ASSET_KINDS.map((kind) => ({ value: kind, label: t(`config.inventory.kind.${kind}`) })),
    [t],
  )
  const criticalityOptions = useMemo(
    () =>
      CRITICALITY_FILTERS.map((criticality) => ({
        value: criticality,
        label: t(`config.inventory.criticality.${criticality}`),
      })),
    [t],
  )
  const areaOptions = useMemo(
    () =>
      (areas.data?.areas ?? []).map((area) => ({
        value: String(area.id),
        label: area.active ? area.name : t('config.inventory.filters.inactiveArea', { name: area.name }),
      })),
    [areas.data, t],
  )

  return (
    <div role="group" aria-label={t('config.inventory.filters.label')} className="flex flex-wrap gap-4">
      <FilterSelect
        label={t('config.inventory.filters.active')}
        value={filters.active}
        onChange={(value) =>
          onChange({ ...filters, active: pick(ACTIVITY_FILTERS, value) ?? filters.active })
        }
      >
        {ACTIVITY_FILTERS.map((activity) => (
          <option key={activity} value={activity}>
            {t(`config.inventory.filters.activity.${activity}`)}
          </option>
        ))}
      </FilterSelect>
      <FilterMultiSelect
        label={t('config.inventory.filters.kind')}
        options={kindOptions}
        value={filters.kind}
        onChange={(values) => onChange({ ...filters, kind: pickAll(ASSET_KINDS, values) })}
        placeholder={t('config.inventory.filters.allKinds')}
      />
      <FilterMultiSelect
        label={t('config.inventory.filters.criticality')}
        options={criticalityOptions}
        value={filters.criticality}
        onChange={(values) => onChange({ ...filters, criticality: pickAll(CRITICALITY_FILTERS, values) })}
        placeholder={t('config.inventory.filters.allCriticalities')}
      />
      <FilterMultiSelect
        label={t('config.inventory.filters.area')}
        options={areaOptions}
        value={filters.area.map(String)}
        onChange={(values) => onChange({ ...filters, area: values.map(Number) })}
        placeholder={t('config.inventory.filters.allAreas')}
        disabled={!areas.isSuccess}
      />
    </div>
  )
}
