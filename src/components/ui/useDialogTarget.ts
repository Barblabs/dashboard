import { useState } from 'react'

export interface DialogTarget<T> {
  /** The last target shown: kept after closing so the body still has it during the exit animation. */
  target: T | null
  open: boolean
  show: (target: T) => void
  close: () => void
}

/** Opens a dialog about one item, such as the user whose role is being changed. */
export function useDialogTarget<T>(): DialogTarget<T> {
  const [target, setTarget] = useState<T | null>(null)
  const [open, setOpen] = useState(false)
  // Created once: show and close keep their identity across renders, like the setters they wrap.
  const [actions] = useState(() => ({
    show: (next: T) => {
      setTarget(next)
      setOpen(true)
    },
    close: () => setOpen(false),
  }))
  return { target, open, ...actions }
}
