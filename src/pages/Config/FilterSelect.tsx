import type { ReactNode } from 'react'
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
    <label className="flex flex-col gap-1 font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase">
      {label}
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </Select>
    </label>
  )
}
