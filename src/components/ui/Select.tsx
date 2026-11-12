import type { ComponentProps } from 'react'
import { FIELD_SURFACE } from './fieldSurface'
import { ChevronDownIcon } from './icons'

// The native arrow can't be positioned, so it is hidden and drawn as an icon with its own inset.
const SELECT =
  `${FIELD_SURFACE} cursor-pointer appearance-none py-2 pr-9 pl-3 text-[0.875rem] focus:border-navy disabled:cursor-not-allowed disabled:bg-panel disabled:text-gray aria-invalid:border-critical`

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative flex w-full">
      <select className={`${SELECT} ${className}`} {...props} />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray" />
    </span>
  )
}
