import type { ReactNode } from 'react'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'

export function FilterSelect({
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
    <Field
      label={label}
      labelClassName="font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase"
      className="gap-1"
    >
      {/* As tall as a filter MultiSelect, so the fields of a filter bar line up. */}
      <Select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 uppercase">
        {children}
      </Select>
    </Field>
  )
}
