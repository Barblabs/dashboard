import type { ComponentProps, ReactNode } from 'react'
import { InfoTip } from './InfoTip'

/** A white section of a dashboard. Padding is the caller's, since a table inside runs edge to edge. */
export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-xl border border-border-panel bg-white ${className}`} {...props} />
}

/**
 * The Card's title on a ruled band, with room for the controls that change what the Card shows.
 * `help` explains how to read the Card, behind a "?" beside the title.
 */
export function CardHeader({ title, help, actions }: { title: string; help?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-panel px-6 py-4">
      <div className="flex items-center gap-1.5">
        <h2 className="font-title text-[1rem] text-navy">{title}</h2>
        {help && <InfoTip title={title} text={help} />}
      </div>
      {actions}
    </div>
  )
}
