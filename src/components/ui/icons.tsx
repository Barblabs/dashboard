import type { ReactNode } from 'react'

interface IconProps {
  size?: number
  className?: string
}

// Icons are decoration: the control that holds one carries the accessible name.
function Icon({
  size,
  viewBox,
  className,
  children,
}: IconProps & { size: number; viewBox: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function PencilIcon({ size = 14, className }: IconProps) {
  return (
    <Icon size={size} viewBox={14} className={className}>
      <path
        d="M9.917 1.75a1.65 1.65 0 0 1 2.333 2.333L4.083 12.25 1.167 12.833l.583-2.916L9.917 1.75z"
        strokeWidth="1.4"
      />
    </Icon>
  )
}

export function CloseIcon({ size = 10, className }: IconProps) {
  return (
    <Icon size={size} viewBox={12} className={className}>
      <path d="M3 3l6 6M9 3l-6 6" strokeWidth="1.5" />
    </Icon>
  )
}

export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <Icon size={size} viewBox={16} className={className}>
      <path d="m2.5 8.5 4 4 7-9" strokeWidth="2" />
    </Icon>
  )
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <Icon size={size} viewBox={16} className={className}>
      <circle cx="6.5" cy="6.5" r="4.25" strokeWidth="1.4" />
      <path d="m11 11 2.5 2.5" strokeWidth="1.4" />
    </Icon>
  )
}

export function PlusIcon({ size = 24, className }: IconProps) {
  return (
    <Icon size={size} viewBox={24} className={className}>
      <path d="M12 5v14M5 12h14" strokeWidth="2" />
    </Icon>
  )
}

export function ChevronDownIcon({ size = 12, className }: IconProps) {
  return (
    <Icon size={size} viewBox={12} className={className}>
      <path d="M3 4.5 6 7.5 9 4.5" strokeWidth="1.5" />
    </Icon>
  )
}

export function PowerOffIcon({ size = 16, className }: IconProps) {
  return (
    <Icon size={size} viewBox={16} className={className}>
      <path d="M5.5 3.5A6 6 0 1 0 10.5 3.5M8 1.5v5" strokeWidth="1.5" />
    </Icon>
  )
}

export function RestoreIcon({ size = 16, className }: IconProps) {
  return (
    <Icon size={size} viewBox={16} className={className}>
      <path d="M2.5 8A5.5 5.5 0 1 1 4 12M2.5 12.5V8H7" strokeWidth="1.5" />
    </Icon>
  )
}

export function BanIcon({ size = 16, className }: IconProps) {
  return (
    <Icon size={size} viewBox={16} className={className}>
      <circle cx="8" cy="8" r="6.25" strokeWidth="1.5" />
      <path d="M3.757 3.757l8.486 8.486" strokeWidth="1.5" />
    </Icon>
  )
}

export function UploadFileIcon({ size = 22, className }: IconProps) {
  return (
    <Icon size={size} viewBox={24} className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeWidth="1.8" />
      <path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3" strokeWidth="1.8" />
    </Icon>
  )
}
