import { useTranslation } from 'react-i18next'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { CloseIcon, SearchIcon } from '../../components/ui/icons'
import { hasActiveFilters, type FindingsFilters } from './filters'

interface FilterBarProps {
  filters: FindingsFilters
  onFilter: (key: string, value: string) => void
}

export function FindingsFilterBar({ filters, onFilter }: FilterBarProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-[12rem] flex-[2]">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray" />
        <Input
          type="search"
          aria-label={t('findings.filter.search')}
          placeholder={t('findings.filter.search')}
          value={filters.text}
          onChange={(e) => onFilter('q', e.target.value)}
          className="pl-9"
        />
      </div>

      <label className="flex flex-1 items-center gap-2 font-body text-[0.875rem]">
        <span className="shrink-0 text-gray">{t('findings.filter.band')}</span>
        <Select
          value={filters.band}
          onChange={(e) => onFilter('band', e.target.value)}
          className="min-w-[7rem]"
        >
          <option value="">{t('findings.filter.all')}</option>
          <option value="critical">{t('findings.filter.bandValues.critical')}</option>
          <option value="high">{t('findings.filter.bandValues.high')}</option>
          <option value="medium">{t('findings.filter.bandValues.medium')}</option>
          <option value="low">{t('findings.filter.bandValues.low')}</option>
          <option value="unbanded">{t('findings.filter.bandValues.unbanded')}</option>
        </Select>
      </label>

      <label className="flex flex-1 items-center gap-2 font-body text-[0.875rem]">
        <span className="shrink-0 text-gray">{t('findings.filter.exposure')}</span>
        <Select
          value={filters.exposure}
          onChange={(e) => onFilter('exposure', e.target.value)}
          className="min-w-[9rem]"
        >
          <option value="">{t('findings.filter.all')}</option>
          <option value="internet_facing">{t('findings.filter.exposureValues.internet_facing')}</option>
          <option value="internal">{t('findings.filter.exposureValues.internal')}</option>
          <option value="unknown">{t('findings.filter.exposureValues.unknown')}</option>
        </Select>
      </label>

      <label className="flex flex-1 items-center gap-2 font-body text-[0.875rem]">
        <span className="shrink-0 text-gray">{t('findings.filter.status')}</span>
        <Select
          value={filters.status}
          onChange={(e) => onFilter('status', e.target.value)}
          className="min-w-[7rem]"
        >
          <option value="">{t('findings.filter.all')}</option>
          <option value="open">{t('findings.filter.open')}</option>
          <option value="closed">{t('findings.filter.closed')}</option>
        </Select>
      </label>

      <label className="flex shrink-0 cursor-pointer items-center gap-2 font-body text-[0.875rem]">
        <input
          type="checkbox"
          checked={filters.kev}
          onChange={(e) => onFilter('kev', e.target.checked ? '1' : '')}
          className="focus-ring h-4 w-4 cursor-pointer accent-navy"
        />
        <span>{t('findings.filter.onlyKev')}</span>
      </label>
    </div>
  )
}

interface ChipsProps {
  filters: FindingsFilters
  totalCount: number
  filteredCount: number
  onRemove: (key: string) => void
  onClearAll: () => void
  lastRunAt?: string
}

export function FilterChips({ filters, totalCount, filteredCount, onRemove, onClearAll, lastRunAt }: ChipsProps) {
  const { t } = useTranslation()
  const active = hasActiveFilters(filters)

  const bandLabels: Record<string, string> = {
    critical: t('findings.filter.bandValues.critical'),
    high: t('findings.filter.bandValues.high'),
    medium: t('findings.filter.bandValues.medium'),
    low: t('findings.filter.bandValues.low'),
    unbanded: t('findings.filter.bandValues.unbanded'),
  }
  const exposureLabels: Record<string, string> = {
    internet_facing: t('findings.filter.exposureValues.internet_facing'),
    internal: t('findings.filter.exposureValues.internal'),
    unknown: t('findings.filter.exposureValues.unknown'),
  }

  const chips: { key: string; label: string }[] = []
  if (filters.text) chips.push({ key: 'q', label: t('findings.chips.text', { value: filters.text }) })
  if (filters.band)
    chips.push({
      key: 'band',
      label: t('findings.chips.band', { value: bandLabels[filters.band] ?? filters.band }),
    })
  if (filters.exposure)
    chips.push({
      key: 'exposure',
      label: t('findings.chips.exposure', {
        value: exposureLabels[filters.exposure] ?? filters.exposure,
      }),
    })
  if (filters.status)
    chips.push({
      key: 'status',
      label: t('findings.chips.status', {
        value: filters.status === 'open' ? t('findings.filter.open') : t('findings.filter.closed'),
      }),
    })
  if (filters.kev) chips.push({ key: 'kev', label: t('findings.chips.kev') })
  if (filters.criticality)
    chips.push({ key: 'criticality', label: t('findings.chips.criticality', { value: filters.criticality }) })
  if (filters.assetName)
    chips.push({ key: 'asset', label: t('findings.chips.asset', { value: filters.assetName }) })
  if (filters.area)
    chips.push({
      key: 'area',
      label: t('findings.chips.area', {
        value: filters.area === 'none' ? t('findings.chips.areaNoArea') : filters.area,
      }),
    })
  if (filters.ids.size > 0)
    chips.push({ key: 'ids', label: t('findings.chips.matrix', { count: filters.ids.size }) })

  const countText =
    active && filteredCount < totalCount
      ? t('findings.count.filtered', { count: filteredCount, total: totalCount })
      : t('findings.count.total', { count: totalCount })

  if (!active && !totalCount) return null

  return (
    <div className="flex flex-wrap items-center gap-2 font-body text-[0.875rem]">
      {filters.fromChart && chips.length > 0 && (
        <span className="text-gray">{t('findings.chips.fromChart')}</span>
      )}
      {chips.map(({ key, label }) => (
        <span
          key={key}
          className="flex items-center gap-1 rounded-full border border-border-panel bg-white px-3 py-1 text-[0.8125rem]"
        >
          {label}
          <button
            type="button"
            onClick={() => onRemove(key)}
            aria-label={t('findings.chips.remove')}
            className="focus-ring ml-1 rounded-full text-gray hover:text-navy"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {active && (
        <button
          type="button"
          onClick={onClearAll}
          className="focus-ring rounded-full px-2 py-0.5 text-[0.8125rem] text-gray underline-offset-2 hover:text-navy hover:underline"
        >
          {t('findings.chips.clearAll')}
        </button>
      )}
      <span className="ml-auto text-gray">{countText}</span>
      {filters.fromChart && lastRunAt && (
        <span className="w-full font-body text-[0.75rem] text-gray">
          {t('findings.chips.fromChartRun', { date: lastRunAt })}
        </span>
      )}
    </div>
  )
}
