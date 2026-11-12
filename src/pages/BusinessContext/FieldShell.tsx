import type { ReactNode } from 'react'
import { EMPTY } from '../../i18n/format'

interface ShellProps {
  id: string
  label: string
  error?: string
  /** Such as a character count near the limit: at the label's right, or under the field when the label is hidden. */
  aside?: ReactNode
  /** Filled from a document and not saved yet. */
  suggested?: boolean
  readOnly?: boolean
  /** The label is only for screen readers, where the placeholder says enough. */
  hideLabel?: boolean
  children: ReactNode
}

/** The label, error and suggested mark every field of the form shares. */
export function Shell({ id, label, error, aside, suggested, readOnly, hideLabel, children }: ShellProps) {
  const heading = readOnly ? (
    <span className="font-body text-[0.8125rem] font-semibold text-gray">{label}</span>
  ) : (
    <label htmlFor={id} className="font-body text-[0.875rem] font-semibold text-navy">
      {label}
    </label>
  )
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${suggested ? '-ml-3 border-l-2 border-cyan pl-[10px]' : ''}`}>
      {hideLabel ? (
        <div className="sr-only">{heading}</div>
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          {heading}
          {aside}
        </div>
      )}
      {children}
      {hideLabel && aside && <div className="self-end">{aside}</div>}
      {error && (
        <p id={`${id}-error`} className="font-body text-[0.75rem] text-critical">
          {error}
        </p>
      )}
    </div>
  )
}

/** A field's value as a Viewer reads it. */
export function Shown({ value }: { value: string }) {
  return value.trim() ? (
    <p className="whitespace-pre-wrap font-body text-[0.9375rem] leading-[1.5] text-navy">{value}</p>
  ) : (
    <p className="font-body text-[0.9375rem] text-muted-bg">{EMPTY}</p>
  )
}
