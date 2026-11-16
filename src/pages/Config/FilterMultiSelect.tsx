import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { MultiSelect, type Option } from '../../components/ui/MultiSelect'

// A wrapping <label> would name its first labelable descendant, a chip's remove button once one is chosen,
// so the label points at the input instead.
export function FilterMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <label
        htmlFor={id}
        className="font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase"
      >
        {label}
      </label>
      <MultiSelect
        id={id}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        emptyText={t('config.inventory.filters.noOptions')}
        removeLabel={(chosen) => t('config.inventory.filters.remove', { value: chosen })}
      />
    </div>
  )
}
