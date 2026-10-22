import type { ComponentProps } from 'react'

export type BadgeVariant = 'outline' | 'muted' | 'solid' | 'dashed'

type BadgeProps = ComponentProps<'span'> & {
  variant?: BadgeVariant
}

const VARIANTS: Record<BadgeVariant, string> = {
  outline: 'inline-block border border-navy px-2.5 py-[3px] text-[12px] font-medium text-navy',
  muted: 'inline-block border border-gray px-2.5 py-[3px] text-[12px] font-medium text-gray',
  solid:
    'inline-flex shrink-0 items-center gap-1.5 bg-navy px-2.5 py-1 text-[13px] font-semibold text-white',
  dashed:
    'inline-block border-[1.5px] border-dashed border-navy px-2.5 py-[3px] align-middle text-[11px] font-medium tracking-[0.02em] text-navy',
}

export function Badge({ variant = 'outline', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`rounded-sm font-body whitespace-nowrap ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
