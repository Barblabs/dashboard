import { useTranslation } from 'react-i18next'
import { useDisableUserMutation, type UserResponse } from '../../api/users'
import { ConfirmDialog, TargetModal } from '../../components/ui/Dialog'
import type { DialogTarget } from '../../components/ui/useDialogTarget'
import { requestErrorText } from '../../i18n/errors'

export function DisableDialog({ dialog }: { dialog: DialogTarget<UserResponse> }) {
  return <TargetModal dialog={dialog}>{(user) => <DisableBody user={user} onClose={dialog.close} />}</TargetModal>
}

function DisableBody({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const { t } = useTranslation()
  const disable = useDisableUserMutation()

  return (
    <ConfirmDialog
      title={t('users.disable.title')}
      text={t('users.confirm.text')}
      cancelLabel={t('users.confirm.cancel')}
      confirmLabel={t('users.confirm.confirm')}
      pending={disable.isPending}
      error={requestErrorText(disable.error, t, { fallback: 'users.actions.disableFailed' })}
      onConfirm={() => disable.mutate(user.id, { onSuccess: onClose })}
      onCancel={onClose}
    />
  )
}
