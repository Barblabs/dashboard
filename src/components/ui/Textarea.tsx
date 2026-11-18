import { Input as BaseInput } from '@base-ui/react/input'
import type { ComponentProps } from 'react'
import { FIELD_SURFACE } from './fieldSurface'

type TextareaProps = Omit<ComponentProps<'textarea'>, 'className'> & { className?: string }

// Split like Select: the control's own props on it, the rest, typed for a <textarea>, on the element.
export function Textarea({ className = '', id, name, value, defaultValue, disabled, autoFocus, ...props }: TextareaProps) {
  return (
    <BaseInput
      render={<textarea {...props} />}
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      autoFocus={autoFocus}
      className={`${FIELD_SURFACE} resize-y px-3 py-2.5 text-[0.9375rem] leading-[1.5] focus:border-navy data-disabled:cursor-not-allowed data-disabled:bg-panel data-disabled:text-gray data-invalid:border-critical aria-invalid:border-critical ${className}`}
    />
  )
}
