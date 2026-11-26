import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Collapsible } from '@base-ui/react/collapsible'
import { useAreasQuery } from '../../api/areas'
import {
  ACTIVITY_FILTERS,
  ASSET_KINDS,
  CRITICALITY_FILTERS,
  EXPOSURE_FILTERS,
  EXPOSURES,
  INFORMATION_CLASSIFICATION_FILTERS,
  INFORMATION_CLASSIFICATIONS,
  LIFECYCLE_STAGE_FILTERS,
  type AssetFilters,
} from '../../api/assets'
import { DEFAULT_ASSET_FILTERS } from '../../api/inventory'
import { ChevronDownIcon } from '../../components/ui/icons'
import { exposureLabel, informationClassificationLabel } from './assetText'
import { FilterMultiSelect } from './FilterMultiSelect'
import { FilterSelect } from './FilterSelect'
import { pick, pickAll } from './filters'

// Every advanced filter is a list of selected values; its length is how many narrow the inventory.
// `active` (Status) is not here: it lives in the header and always holds one value.
function countActive({ active: _, ...advanced }: AssetFilters) {
  return Object.values(advanced).reduce((count, values) => count + values.length, 0)
}

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
  const lifecycleStageOptions = useMemo(
    () =>
      LIFECYCLE_STAGE_FILTERS.map((stage) => ({
        value: stage,
        label: t(`config.inventory.lifecycleStage.${stage}`),
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

  const activeCount = countActive(filters)
  // The disclosure is the user's to open; it only starts open when a filter is already set, so a
  // returning user sees the state that is narrowing their inventory.
  const [open, setOpen] = useState(() => activeCount > 0)
  // Resets only the advanced filters behind the disclosure; Status keeps the user's choice.
  const clearAdvanced = () => onChange({ ...DEFAULT_ASSET_FILTERS, active: filters.active })

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      render={<div role="group" aria-label={t('config.inventory.filters.label')} />}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44 max-w-full">
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
        </div>

        <div className="flex items-center gap-2">
          <Collapsible.Trigger className="focus-ring group flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border-panel bg-white px-3.5 font-body text-[0.875rem] font-semibold text-navy transition-[border-color,background-color] duration-150 ease-[ease] hover:border-navy data-panel-open:border-navy data-panel-open:bg-navy/5">
            {activeCount > 0
              ? t('config.inventory.filters.moreActive', { count: activeCount })
              : t('config.inventory.filters.more')}
            <ChevronDownIcon className="text-gray transition-transform duration-200 ease-[ease] group-data-panel-open:-rotate-180 motion-reduce:transition-none" />
          </Collapsible.Trigger>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAdvanced}
              className="focus-ring cursor-pointer rounded-md px-2 py-1 font-body text-[0.8125rem] font-semibold text-gray transition-colors duration-150 ease-[ease] hover:text-navy"
            >
              {t('config.inventory.filters.clear')}
            </button>
          )}
        </div>
      </div>

      {/*
       * Base UI animates the panel height through --collapsible-panel-height and marks the
       * open/closed edges with data-starting-style / data-ending-style. Height and opacity
       * animate together so the material reads as arriving, not just unrolling; overflow-hidden
       * clips the grid while the height is mid-flight.
       */}
      <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden opacity-100 transition-[height,opacity] duration-200 ease-[ease] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none">
        <div
          aria-label={t('config.inventory.filters.panelLabel')}
          className="grid grid-cols-1 gap-x-4 gap-y-4 pt-1 sm:grid-cols-2 lg:grid-cols-3"
        >
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
            label={t('config.inventory.filters.lifecycleStage')}
            options={lifecycleStageOptions}
            value={filters.lifecycle_stage}
            onChange={(values) => onChange({ ...filters, lifecycle_stage: pickAll(LIFECYCLE_STAGE_FILTERS, values) })}
            placeholder={t('config.inventory.filters.allLifecycleStages')}
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
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
