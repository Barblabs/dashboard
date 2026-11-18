import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'

const BACKDROP =
  'fixed inset-0 z-dialog bg-navy/40 transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0'

// Opacity always animates; the scale only when the user allows motion.
const POPUP =
  'fixed top-1/2 left-1/2 z-dialog -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl transition-[opacity,scale] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:data-ending-style:scale-[0.96] motion-safe:data-starting-style:scale-[0.96]'

const WIDTH = {
  sm: 'w-[min(32rem,calc(100vw-2rem))]',
  md: 'w-[min(36rem,calc(100vw-2rem))]',
  lg: 'w-[min(40rem,calc(100vw-2rem))]',
  // A whole record to read rather than a form: a fixed size, inside which its content scrolls.
  xl: 'w-[min(68rem,calc(100vw-2rem))] h-[min(54rem,calc(100vh-4rem))] overflow-hidden',
}

export type ModalWidth = keyof typeof WIDTH

interface Props {
  open: boolean
  onClose: () => void
  /** Id of the heading that names the dialog, when it is not a DialogLayout title. */
  labelledBy?: string
  width?: ModalWidth
  /** What takes focus on open, when the first focusable element is not the right one. */
  initialFocus?: Dialog.Popup.Props['initialFocus']
  children: ReactNode
}

export function Modal({ open, onClose, labelledBy, width = 'sm', initialFocus, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        {/* Even an undefined aria-labelledby would override the one Dialog.Title sets. */}
        <Dialog.Popup
          {...(labelledBy && { 'aria-labelledby': labelledBy })}
          initialFocus={initialFocus}
          className={`${POPUP} ${WIDTH[width]}`}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
