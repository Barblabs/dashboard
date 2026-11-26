import { Fragment, type ReactNode } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

/** One fact about the connection beside the badge; each adds its font and colour. */
export const CONNECTION_DETAIL = 'min-w-0 text-[0.8125rem] wrap-anywhere md:overflow-hidden md:text-ellipsis md:whitespace-nowrap'

/** A row under the bar's header; each adds its border and background colour. */
export const CONNECTION_STRIP = 'flex animate-fade-in flex-wrap items-center gap-4 border-t px-6 py-3.5'

export const CONNECTION_STRIP_TEXT = 'flex-[1_1_16rem] font-body text-[0.875rem] leading-[1.4]'

interface ConnectionBarProps {
  badge: string
  /** Shown in order, separated by dots; a `false` leaves its fact out. */
  details: (ReactNode | false)[]
  /** Left out for a User who only reads the connection. */
  actions?: ReactNode
  /** The strips under the header: results, failures and confirmations. */
  children?: ReactNode
}

/** A live connection to an outside system: what it is connected to, and what can be done with it. */
export function ConnectionBar({ badge, details, actions, children }: ConnectionBarProps) {
  const shown = details.filter((detail) => detail !== false)
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-panel">
      <div className="flex flex-wrap items-center gap-4 bg-white px-6 py-4">
        <div className="flex min-w-0 basis-full flex-wrap items-center gap-2 md:flex-1">
          <Badge variant="solid">{badge}</Badge>
          {shown.map((detail, index) => (
            // The facts are a fixed list per bar, so their position is their identity.
            <Fragment key={index}>
              {index > 0 && <span className="text-[0.875rem] text-border-panel">·</span>}
              {detail}
            </Fragment>
          ))}
        </div>
        {actions && <div className="flex flex-wrap gap-2 md:shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

interface DisconnectConfirmProps {
  text: string
  /** Replaces the question once a disconnect failed. */
  error: string | null
  confirmLabel: string
  pendingLabel: string
  cancelLabel: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}

// A question, not a failure: only the danger button carries the critical color.
export function DisconnectConfirm({
  text,
  error,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  pending,
  onConfirm,
  onCancel,
}: DisconnectConfirmProps) {
  return (
    <div className={`${CONNECTION_STRIP} border-border-panel bg-panel`}>
      {error ? (
        <p role="alert" className={`${CONNECTION_STRIP_TEXT} text-critical`}>
          {error}
        </p>
      ) : (
        <p className={`${CONNECTION_STRIP_TEXT} text-navy`}>{text}</p>
      )}
      <div className="flex shrink-0 gap-2">
        <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
          {pending ? pendingLabel : confirmLabel}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  )
}
