import type { ReactNode } from 'react'
import { Field as BaseField } from '@base-ui/react/field'

type FieldProps = Omit<BaseField.Root.Props, 'className' | 'invalid'> & {
  label: ReactNode
  help?: ReactNode
  /** Validation is owned by the caller (e.g. react-hook-form); a message here marks the field invalid. */
  error?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ label, help, error, className = '', children, ...props }: FieldProps) {
  const invalid = Boolean(error)

  return (
    <BaseField.Root invalid={invalid} className={`flex flex-col gap-1 ${className}`} {...props}>
      <BaseField.Label className="font-body text-[14px] font-semibold text-navy">
        {label}
      </BaseField.Label>
      {children}
      {invalid ? (
        <BaseField.Error match className="font-body text-[12px] leading-[1.4] text-critical">
          {error}
        </BaseField.Error>
      ) : (
        help && (
          <BaseField.Description className="font-body text-[12px] leading-[1.4] text-gray">
            {help}
          </BaseField.Description>
        )
      )}
    </BaseField.Root>
  )
}
