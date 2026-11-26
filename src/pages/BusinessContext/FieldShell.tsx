import type { ReactNode } from 'react'
import { Field as BaseField } from '@base-ui/react/field'
import { EMPTY } from '../../i18n/format'

interface ShellProps {
  /** Only needed for controls that don't auto-register with the Field context (e.g. MultiSelect). */
  id?: string
  label: string
  help?: string
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
export function Shell({ id, label, help, error, aside, suggested, readOnly, hideLabel, children }: ShellProps) {
  if (readOnly) {
    return (
      <div className={`flex min-w-0 flex-col gap-1.5 ${suggested ? '-ml-3 border-l-2 border-cyan pl-[10px]' : ''}`}>
        {hideLabel ? (
          <div className="sr-only">
            <span className="font-body text-[0.8125rem] font-semibold text-gray">{label}</span>
          </div>
        ) : (
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-body text-[0.8125rem] font-semibold text-gray">{label}</span>
            {aside}
          </div>
        )}
        {children}
        {hideLabel && aside && <div className="self-end">{aside}</div>}
      </div>
    )
  }

  const labelNode = (
    <BaseField.Label htmlFor={id} className="font-body text-[0.875rem] font-semibold text-navy">
      {label}
    </BaseField.Label>
  )

  return (
    <BaseField.Root
      invalid={Boolean(error)}
      className={`flex min-w-0 flex-col gap-1.5 ${suggested ? '-ml-3 border-l-2 border-cyan pl-[10px]' : ''}`}
    >
      {hideLabel ? (
        <div className="sr-only">{labelNode}</div>
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          {labelNode}
          {aside}
        </div>
      )}
      {children}
      {hideLabel && aside && <div className="self-end">{aside}</div>}
      {error ? (
        <BaseField.Error match className="font-body text-[0.75rem] text-critical">
          {error}
        </BaseField.Error>
      ) : (
        help && (
          <BaseField.Description className="font-body text-[0.75rem] leading-[1.4] text-gray">
            {help}
          </BaseField.Description>
        )
      )}
    </BaseField.Root>
  )
}

/** A field's value as a Viewer reads it. */
export function Shown({ value }: { value: string }) {
  return value.trim() ? (
    <p className="whitespace-pre-wrap font-body text-[0.9375rem] leading-[1.5] text-navy">{value}</p>
  ) : (
    <p className="font-body text-[0.9375rem] text-gray">{EMPTY}</p>
  )
}
