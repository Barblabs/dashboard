import type { ComponentProps } from 'react'

export type AlertTone = 'error' | 'success' | 'info'

const TONES: Record<AlertTone, string> = {
  error: 'border-critical bg-critical/5 text-[0.875rem] text-critical',
  success: 'border-nav-active-bg bg-nav-active-bg/6 text-[0.875rem] text-nav-active-bg',
  info: 'border-border-panel bg-panel text-[0.8125rem] text-gray',
}

// An error interrupts assistive tech, a success is announced politely, a notice is just read in place.
const ROLES: Record<AlertTone, 'alert' | 'status' | undefined> = {
  error: 'alert',
  success: 'status',
  info: undefined,
}

type AlertProps = ComponentProps<'div'> & { tone: AlertTone }

export function Alert({ tone, className = '', ...props }: AlertProps) {
  return (
    <div
      role={ROLES[tone]}
      className={`rounded-md border px-4 py-3 font-body leading-[1.4] ${TONES[tone]} ${className}`}
      {...props}
    />
  )
}
