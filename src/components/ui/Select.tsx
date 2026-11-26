import type { ComponentProps } from 'react'
import { Input as BaseInput } from '@base-ui/react/input'
import { FIELD_SURFACE } from './fieldSurface'
import { ChevronDownIcon } from './icons'

// The native arrow can't be positioned, so it is hidden and drawn as an icon with its own inset.
// As tall as an Input, so a select beside a text field or a filter MultiSelect lines up with it.
const SELECT =
  `${FIELD_SURFACE} h-11 cursor-pointer appearance-none pr-9 pl-3 text-base md:text-[0.9375rem] focus:border-navy disabled:cursor-not-allowed disabled:bg-panel disabled:text-gray aria-invalid:border-critical`

/*
 * Rendered through Base UI's field control, like Input: inside a Field its label and help
 * text reach the select, which a bare <select> never registers for. The control reads its own
 * props (id, name, value, disabled); the rest, typed for a <select>, go on the element, whose
 * handlers and ref Base UI merges with its own.
 */
export function Select({
  className = '',
  id,
  name,
  value,
  defaultValue,
  disabled,
  autoFocus,
  ...props
}: ComponentProps<'select'>) {
  return (
    <span className="relative flex w-full">
      <BaseInput
        render={<select {...props} />}
        className={`${SELECT} ${className}`}
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray" />
    </span>
  )
}
