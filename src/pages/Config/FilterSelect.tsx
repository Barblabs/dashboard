import type { ReactNode } from 'react'

// The native arrow can't be positioned, so it is hidden and drawn as an icon with its own inset.
const SELECT =
  'focus-ring w-full cursor-pointer appearance-none rounded-md border border-border-panel bg-white py-2 pr-9 pl-3 font-body text-[0.875rem] text-navy outline-none focus:border-navy'

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
      <span className="relative flex">
        <select className={SELECT} value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-gray"
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  )
}
