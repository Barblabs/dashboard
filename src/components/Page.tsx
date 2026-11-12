import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  /** Shown at the header's right, such as the page's main action. */
  actions?: ReactNode
  children?: ReactNode
}

export function Page({ title, subtitle, actions, children }: Props) {
  return (
    <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-[44rem] flex-col gap-1.5">
          <h1 className="font-title text-[1.875rem] leading-[1.15] tracking-[-0.01em] text-navy">
            {title}
          </h1>
          {subtitle && <p className="font-body text-[0.9375rem] leading-[1.4] text-gray">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </main>
  )
}
