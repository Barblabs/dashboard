import { useId } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import type { CmdbSource } from '../../api/cmdb'
import { ItopForm } from './ItopForm'

interface Props {
  source: CmdbSource
  open: boolean
  onClose: () => void
}

const BACKDROP =
  'fixed inset-0 bg-navy/40 transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0'

// Opacity always animates; the scale only when the user allows motion.
const POPUP =
  'fixed top-1/2 left-1/2 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl transition-[opacity,scale] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:data-ending-style:scale-[0.96] motion-safe:data-starting-style:scale-[0.96]'

// Editing a live connection is a short modal task: the connected view stays behind it, dimmed.
export function EditConnectionDialog({ source, open, onClose }: Props) {
  const titleId = useId()

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup aria-labelledby={titleId} className={POPUP}>
          <ItopForm
            mode="update"
            titleId={titleId}
            initialValues={{ url: source.url, user: source.user ?? '' }}
            onBack={onClose}
            onSaved={onClose}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
