import type { ComponentProps } from 'react'

export type BadgeVariant = 'outline' | 'muted' | 'solid' | 'caps'

type BadgeProps = ComponentProps<'span'> & {
  variant?: BadgeVariant
}

const VARIANTS: Record<BadgeVariant, string> = {
  outline: 'inline-block border border-navy px-2.5 py-[3px] text-[12px] font-medium text-navy',
  muted: 'inline-block border border-gray px-2.5 py-[3px] text-[12px] font-medium text-gray',
  solid:
    'inline-flex shrink-0 items-center gap-1.5 bg-navy px-2.5 py-1 text-[13px] font-semibold text-white',
  caps: 'inline-block shrink-0 border border-muted-bg px-2.5 py-1 text-[12px] font-semibold tracking-[0.06em] text-gray uppercase',
}

export function Badge({ variant = 'outline', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`rounded-sm font-body whitespace-nowrap ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
