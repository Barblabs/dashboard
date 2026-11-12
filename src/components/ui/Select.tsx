import type { ComponentProps } from 'react'
import { ChevronDownIcon } from './icons'

// The native arrow can't be positioned, so it is hidden and drawn as an icon with its own inset.
const SELECT =
  'focus-ring w-full cursor-pointer appearance-none rounded-md border border-border-panel bg-white py-2 pr-9 pl-3 font-body text-[0.875rem] text-navy outline-none transition-[border-color] duration-150 ease-[ease] focus:border-navy disabled:cursor-not-allowed disabled:bg-panel disabled:text-gray aria-invalid:border-critical'

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative flex w-full">
      <select className={`${SELECT} ${className}`} {...props} />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray" />
    </span>
  )
}
