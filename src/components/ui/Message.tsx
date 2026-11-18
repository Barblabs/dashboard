import type { ComponentProps } from 'react'

type MessageTone = 'muted' | 'error'

const TONES: Record<MessageTone, string> = {
  muted: 'text-gray',
  error: 'flex flex-col items-center gap-4 text-critical',
}

type MessageProps = ComponentProps<'div'> & { tone?: MessageTone }

/** A centered line that stands in for content that is loading, missing or failed to load. */
export function Message({ tone = 'muted', className = '', ...props }: MessageProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={`px-6 py-12 text-center font-body text-[0.875rem] ${TONES[tone]} ${className}`}
      {...props}
    />
  )
}
