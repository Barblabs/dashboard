import { useTranslation } from 'react-i18next'
import {
  ACTIVITY_FILTERS,
  ASSET_KINDS,
  CRITICALITIES,
  type AssetFilters,
} from '../../api/assets'
import { FilterSelect } from './FilterSelect'
import { pick } from './filters'

export function AssetFilterBar({
  filters,
  onChange,
}: {
  filters: AssetFilters
  onChange: (filters: AssetFilters) => void
}) {
  const { t } = useTranslation()

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
      <FilterSelect
        label={t('config.inventory.filters.kind')}
        value={filters.kind ?? ''}
        onChange={(value) => onChange({ ...filters, kind: pick(ASSET_KINDS, value) })}
      >
        <option value="">{t('config.inventory.filters.allKinds')}</option>
        {ASSET_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {t(`config.inventory.kind.${kind}`)}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        label={t('config.inventory.filters.criticality')}
        value={filters.criticality ?? ''}
        onChange={(value) => onChange({ ...filters, criticality: pick(CRITICALITIES, value) })}
      >
        <option value="">{t('config.inventory.filters.allCriticalities')}</option>
        {CRITICALITIES.map((criticality) => (
          <option key={criticality} value={criticality}>
            {t(`config.inventory.criticality.${criticality}`)}
          </option>
        ))}
      </FilterSelect>
    </div>
  )
}
