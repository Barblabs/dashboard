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
      labelClassName="font-body text-[0.75rem] font-semibold text-gray"
      className="gap-1"
    >
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </Select>
    </Field>
  )
}
