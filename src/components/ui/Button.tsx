import { Button as BaseButton } from '@base-ui/react/button'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'lg' | 'md' | 'sm'

type ButtonProps = Omit<BaseButton.Props, 'className'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  className?: string
}

// One transition covers every property a variant changes on hover or press, at any size.
// The press scale is feedback on pointer-down, before the click resolves.
const BASE =
  'focus-ring cursor-pointer rounded-md font-body font-semibold whitespace-nowrap transition-[opacity,background-color,border-color,color,scale] duration-150 ease-[ease] data-disabled:cursor-not-allowed data-disabled:opacity-45 motion-safe:not-data-disabled:active:scale-[0.97]'

const SIZES: Record<ButtonSize, string> = {
  lg: 'h-11 px-4 text-[0.875rem]',
  md: 'h-[42px] px-5 text-[0.875rem]',
  sm: 'h-9 px-3.5 text-[0.8125rem]',
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-white not-data-disabled:hover:opacity-88',
  secondary: 'border border-navy bg-transparent text-navy not-data-disabled:hover:bg-navy/5',
  ghost:
    'border border-border-panel bg-transparent text-gray not-data-disabled:hover:border-critical not-data-disabled:hover:text-critical',
  danger: 'bg-critical text-white not-data-disabled:hover:opacity-88',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      type={type}
      // Loading keeps the button focusable so keyboard users don't lose their place mid-request.
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
