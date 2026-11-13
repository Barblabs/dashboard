import type { ComponentProps } from 'react'
import { Input as BaseInput } from '@base-ui/react/input'
import { FIELD_SURFACE } from './fieldSurface'
import { ChevronDownIcon } from './icons'

// The native arrow can't be positioned, so it is hidden and drawn as an icon with its own inset.
const SELECT =
  `${FIELD_SURFACE} cursor-pointer appearance-none py-2 pr-9 pl-3 text-[0.875rem] focus:border-navy disabled:cursor-not-allowed disabled:bg-panel disabled:text-gray aria-invalid:border-critical`

/*
 * Rendered through Base UI's field control, like Input: inside a Field its label and help
 * text reach the select, which a bare <select> never registers for.
 */
export function Select({ className = '', children, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative flex w-full">
      <BaseInput render={<select />} className={`${SELECT} ${className}`} {...(props as BaseInput.Props)}>
        {children}
      </BaseInput>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray" />
    </span>
  )
}
