import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useInviteUserMutation, type UserResponse } from '../../api/users'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { DialogLayout } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/useToast'
import { requestErrorText } from '../../i18n/errors'
import { RoleOptions } from './RoleOptions'

const inviteSchema = z.object({
  email: z.string().trim().min(1, 'users.invite.email.required').email('users.invite.email.invalid'),
  role: z.enum(['customer_admin', 'viewer']),
})
type InviteFields = z.infer<typeof inviteSchema>

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <InviteBody onClose={onClose} />
    </Modal>
  )
}

function InviteBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFields>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'viewer' },
  })

  function announce(invited: UserResponse) {
    toast.show(
      invited.pending
        ? { tone: 'warning', text: t('users.invite.pending', { email: invited.email }) }
        : { tone: 'success', text: t('users.invite.sent', { email: invited.email }) },
    )
  }

  const invite = useInviteUserMutation({ onInvited: announce })

  const onSubmit = handleSubmit((data) => invite.mutate(data, { onSuccess: onClose }))

  return (
    <DialogLayout
      title={t('users.invite.title')}
      error={requestErrorText(invite.error, t, { fallback: 'users.invite.failed' })}
      onSubmit={onSubmit}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('users.invite.cancel')}
          </Button>
          <Button type="submit" loading={invite.isPending} size="sm">
            {invite.isPending ? t('users.invite.submitting') : t('users.invite.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label={t('users.invite.email.label')}
          error={
            errors.email?.message
              ? t(errors.email.message as 'users.invite.email.required')
              : undefined
          }
        >
          <Input
            type="email"
            placeholder="nombre@empresa.com"
            autoComplete="off"
            disabled={invite.isPending}
            {...register('email')}
          />
        </Field>

        <Field label={t('users.invite.role.label')}>
          <Select
            disabled={invite.isPending}
            {...register('role')}
          >
            <RoleOptions />
          </Select>
        </Field>

        <Alert tone="info">{t('users.invite.tempPasswordNotice')}</Alert>
      </div>
    </DialogLayout>
  )
}
