import type { FormEvent, ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Alert } from './Alert'
import { Button } from './Button'
import { Modal, type ModalWidth } from './Modal'
import type { DialogTarget } from './useDialogTarget'

/*
 * A dialog's state (form values, mutation, wizard step) belongs in a body component rendered
 * inside the Modal: the popup unmounts once closed, so reopening starts clean without resets.
 */

interface DialogLayoutProps {
  title: ReactNode
  description?: ReactNode
  /** Shown above the title, e.g. a step indicator. */
  eyebrow?: ReactNode
  error?: string | null
  actions: ReactNode
  /** Makes the dialog a form, so Enter in a field submits it. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  children?: ReactNode
}

const LAYOUT = 'flex flex-col gap-5 p-6'

export function DialogLayout({ title, description, eyebrow, error, actions, onSubmit, children }: DialogLayoutProps) {
  const content = (
    <>
      {eyebrow}
      <div className="flex flex-col gap-1.5">
        {/* Dialog.Title and Dialog.Description name and describe the popup on their own. */}
        <Dialog.Title className="font-title text-[1.25rem] leading-tight text-navy">{title}</Dialog.Title>
        {description && (
          <Dialog.Description className="font-body text-[0.875rem] leading-[1.5] text-gray">
            {description}
          </Dialog.Description>
        )}
      </div>
      {children}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
    </>
  )

  return onSubmit ? (
    <form noValidate onSubmit={onSubmit} className={LAYOUT}>
      {content}
    </form>
  ) : (
    <div className={LAYOUT}>{content}</div>
  )
}

interface ConfirmDialogProps {
  title: string
  text: string
  cancelLabel: string
  confirmLabel: string
  pending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** A destructive action the user confirms or cancels. */
export function ConfirmDialog({
  title,
  text,
  cancelLabel,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <DialogLayout
      title={title}
      error={error}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="font-body text-[0.9375rem] text-navy">{text}</p>
    </DialogLayout>
  )
}

interface TargetModalProps<T> {
  dialog: DialogTarget<T>
  width?: ModalWidth
  children: (target: T) => ReactNode
}

/** A Modal whose body receives the dialog's target, never null. */
export function TargetModal<T>({ dialog, width, children }: TargetModalProps<T>) {
  return (
    <Modal open={dialog.open} onClose={dialog.close} width={width}>
      {dialog.target !== null && children(dialog.target)}
    </Modal>
  )
}
