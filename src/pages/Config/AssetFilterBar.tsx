import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ACTIVITY_FILTERS,
  ASSET_KINDS,
  CRITICALITIES,
  type AssetFilters,
} from '../../api/assets'

// The native arrow can't be positioned, so it is hidden and drawn as an icon with its own inset.
const SELECT =
  'focus-ring w-full cursor-pointer appearance-none rounded-md border border-border-panel bg-white py-2 pr-9 pl-3 font-body text-[0.875rem] text-navy outline-none focus:border-navy'

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase">
      {label}
      <span className="relative flex">
        <select className={SELECT} value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-gray"
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  )
}

// Option values come from the fixed lists, so a lookup narrows them back without a cast.
function pick<T extends string>(options: readonly T[], value: string): T | null {
  return options.find((option) => option === value) ?? null
}

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
