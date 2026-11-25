import type { ComponentProps } from 'react'

export type BadgeVariant = 'outline' | 'muted' | 'solid' | 'quiet' | 'critical' | 'warning' | 'caution' | 'good'

type BadgeProps = ComponentProps<'span'> & {
  variant?: BadgeVariant
}

// Every variant keeps the same box, so badges side by side (a role, a status) are one size.
const BOX = 'inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-0.5 font-body text-[0.75rem] whitespace-nowrap'

const VARIANTS: Record<BadgeVariant, string> = {
  outline: 'border-navy font-medium text-navy',
  muted: 'border-gray font-medium text-gray',
  solid: 'border-navy bg-navy font-semibold text-white',
  quiet: 'border-muted-bg font-semibold text-gray',
  critical: 'border-critical font-medium text-critical',
  // Orange text on white is unreadable: the tone lives in the border and tint, the text stays navy.
  warning: 'border-high bg-high/10 font-medium text-navy',
  // Yellow text is unreadable too, for the same reason.
  caution: 'border-medium bg-medium/15 font-medium text-navy',
  good: 'border-good font-medium text-good',
}

export function Badge({ variant = 'outline', className = '', ...props }: BadgeProps) {
  return <span className={`${BOX} ${VARIANTS[variant]} ${className}`} {...props} />
}
