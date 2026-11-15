import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAreasQuery } from '../../api/areas'
import {
  ACTIVITY_FILTERS,
  ASSET_KINDS,
  CRITICALITY_FILTERS,
  EXPOSURE_FILTERS,
  EXPOSURES,
  INFORMATION_CLASSIFICATION_FILTERS,
  INFORMATION_CLASSIFICATIONS,
  type AssetFilters,
} from '../../api/assets'
import { exposureLabel, informationClassificationLabel } from './assetText'
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
  // `pick` reads the Unknown and Unclassified filters as `null`, which the labels name as such.
  const exposureOptions = useMemo(
    () =>
      EXPOSURE_FILTERS.map((exposure) => ({ value: exposure, label: exposureLabel(t, pick(EXPOSURES, exposure)) })),
    [t],
  )
  const informationClassificationOptions = useMemo(
    () =>
      INFORMATION_CLASSIFICATION_FILTERS.map((classification) => ({
        value: classification,
        label: informationClassificationLabel(t, pick(INFORMATION_CLASSIFICATIONS, classification)),
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
        label={t('config.inventory.filters.exposure')}
        options={exposureOptions}
        value={filters.exposure}
        onChange={(values) => onChange({ ...filters, exposure: pickAll(EXPOSURE_FILTERS, values) })}
        placeholder={t('config.inventory.filters.allExposures')}
      />
      <FilterMultiSelect
        label={t('config.inventory.filters.informationClassification')}
        options={informationClassificationOptions}
        value={filters.information_classification}
        onChange={(values) =>
          onChange({ ...filters, information_classification: pickAll(INFORMATION_CLASSIFICATION_FILTERS, values) })
        }
        placeholder={t('config.inventory.filters.allInformationClassifications')}
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
