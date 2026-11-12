import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChangeRoleMutation, type CustomerRole, type UserResponse } from '../../api/users'
import { Button } from '../../components/ui/Button'
import { DialogLayout, TargetModal } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import type { DialogTarget } from '../../components/ui/useDialogTarget'
import { requestErrorText } from '../../i18n/errors'
import { RoleOptions } from './RoleOptions'

export function ChangeRoleDialog({ dialog }: { dialog: DialogTarget<UserResponse> }) {
  return <TargetModal dialog={dialog}>{(user) => <ChangeRoleBody user={user} onClose={dialog.close} />}</TargetModal>
}

function ChangeRoleBody({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const { t } = useTranslation()
  const changeRole = useChangeRoleMutation()
  const [selectedRole, setSelectedRole] = useState<CustomerRole>(user.role)

  return (
    <DialogLayout
      title={t('users.changeRole.title')}
      error={requestErrorText(changeRole.error, t, { fallback: 'users.actions.roleChangeFailed' })}
      onSubmit={() => changeRole.mutate({ id: user.id, role: selectedRole }, { onSuccess: onClose })}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('users.confirm.cancel')}
          </Button>
          <Button type="submit" loading={changeRole.isPending} size="sm">
            {t('users.changeRole.save')}
          </Button>
        </>
      }
    >
      <Field label={t('users.invite.role.label')}>
        <Select
          value={selectedRole}
          disabled={changeRole.isPending}
          onChange={(e) => {
            changeRole.reset()
            setSelectedRole(e.target.value as CustomerRole)
          }}
        >
          <RoleOptions />
        </Select>
      </Field>
    </DialogLayout>
  )
}
