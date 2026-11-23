import type { ComponentProps } from 'react'

export type BadgeVariant = 'outline' | 'muted' | 'solid' | 'quiet' | 'critical' | 'warning' | 'caution'

type BadgeProps = ComponentProps<'span'> & {
  variant?: BadgeVariant
}

const VARIANTS: Record<BadgeVariant, string> = {
  outline: 'inline-block border border-navy px-2.5 py-[3px] text-[0.75rem] font-medium text-navy',
  muted: 'inline-block border border-gray px-2.5 py-[3px] text-[0.75rem] font-medium text-gray',
  solid:
    'inline-flex shrink-0 items-center gap-1.5 bg-navy px-2.5 py-1 text-[0.8125rem] font-semibold text-white',
  quiet: 'inline-block shrink-0 border border-muted-bg px-2.5 py-1 text-[0.75rem] font-semibold text-gray',
  critical: 'inline-block border border-critical px-2.5 py-[3px] text-[0.75rem] font-medium text-critical',
  // Orange text on white is unreadable: the tone lives in the border and tint, the text stays navy.
  warning: 'inline-block border border-high bg-high/10 px-2.5 py-[3px] text-[0.75rem] font-medium text-navy',
  // Yellow text is unreadable too, for the same reason.
  caution: 'inline-block border border-medium bg-medium/15 px-2.5 py-[3px] text-[0.75rem] font-medium text-navy',
}

export function Badge({ variant = 'outline', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`rounded-sm font-body whitespace-nowrap ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
