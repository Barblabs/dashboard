import type { ComponentProps } from 'react'

// The white card that holds each step of a flow; spacing between children is the caller's.
export function Panel({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col rounded-xl border border-border-panel bg-white p-6 ${className}`}
      {...props}
    />
  )
}

export function PanelTitle({ className = '', ...props }: ComponentProps<'h3'>) {
  return (
    <h3 className={`font-title text-[20px] leading-[1.2] text-navy ${className}`} {...props} />
  )
}
