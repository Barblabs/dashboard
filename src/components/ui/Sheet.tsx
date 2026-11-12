import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { useTranslation } from 'react-i18next'
import { CloseIcon } from './icons'

const BACKDROP =
  'fixed inset-0 bg-navy/25 transition-opacity duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:opacity-0 data-starting-style:opacity-0'

// Opacity always animates; the slide only when the user allows motion.
const POPUP =
  'fixed top-0 right-0 flex h-full w-[min(28rem,100vw)] flex-col bg-white shadow-2xl outline-none transition-[opacity,translate] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:data-ending-style:translate-x-6 motion-safe:data-starting-style:translate-x-6'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * A panel from the right edge, for working through items beside the page rather than over it.
 * Like a Modal, its content unmounts once closed.
 */
export function Sheet({ open, onClose, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup className={POPUP}>{children}</Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** The sheet's title, with an optional eyebrow above it, and its close button. */
export function SheetHeader({ title, eyebrow }: { title: ReactNode; eyebrow?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-panel px-6 py-5">
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase">
            {eyebrow}
          </span>
        )}
        <Dialog.Title className="font-title text-[1.25rem] leading-tight text-navy">{title}</Dialog.Title>
      </div>
      <Dialog.Close
        aria-label={t('common.close')}
        className="focus-ring mt-1 cursor-pointer rounded-sm p-1.5 text-gray transition-colors duration-150 hover:text-navy"
      >
        <CloseIcon size={12} />
      </Dialog.Close>
    </div>
  )
}
