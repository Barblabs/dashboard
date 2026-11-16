import { Input as BaseInput } from '@base-ui/react/input'
import type { ComponentProps } from 'react'
import { FIELD_SURFACE } from './fieldSurface'

type TextareaProps = Omit<ComponentProps<'textarea'>, 'className'> & { className?: string }

export function Textarea({ className = '', rows, ...props }: TextareaProps) {
  return (
    <BaseInput
      render={<textarea rows={rows} />}
      className={`${FIELD_SURFACE} resize-y px-3 py-2.5 text-[0.9375rem] leading-[1.5] focus:border-navy data-invalid:border-critical aria-invalid:border-critical ${className}`}
      {...(props as BaseInput.Props)}
    />
  )
}
