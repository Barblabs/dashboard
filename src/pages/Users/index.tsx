import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useCurrentUser } from '../../auth/store'
import {
  useChangeRoleMutation,
  useDisableUserMutation,
  useInviteUserMutation,
  useUsersQuery,
  type CustomerRole,
  type UserResponse,
} from '../../api/users'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog, DialogLayout, TargetModal } from '../../components/ui/Dialog'
import { Fab } from '../../components/ui/Fab'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { BanIcon, PencilIcon } from '../../components/ui/icons'
import { Message } from '../../components/ui/Message'
import { Modal } from '../../components/ui/Modal'
import { SearchField } from '../../components/ui/SearchField'
import { Select } from '../../components/ui/Select'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { requestErrorText } from '../../i18n/errors'

function RoleOptions() {
  const { t } = useTranslation()
  return (
    <>
      <option value="viewer">{t('users.role.viewer')}</option>
      <option value="customer_admin">{t('users.role.customer_admin')}</option>
    </>
  )
}

// ── Invite dialog ───────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().trim().min(1, 'users.invite.email.required').email('users.invite.email.invalid'),
  role: z.enum(['customer_admin', 'viewer']),
})
type InviteFields = z.infer<typeof inviteSchema>

function InviteBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const invite = useInviteUserMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFields>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'viewer' },
  })

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

// ── Change-role dialog ───────────────────────────────────────────────────────

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

// ── Disable-user dialog ──────────────────────────────────────────────────────

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

// ── User table ───────────────────────────────────────────────────────────────

const TH = 'px-4 py-3 font-body text-[0.75rem] font-semibold uppercase tracking-wider text-gray text-left'

function UserTable({
  users,
  onEditRole,
  onDisable,
}: {
  users: UserResponse[]
  onEditRole: (user: UserResponse) => void
  onDisable: (user: UserResponse) => void
}) {
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const [search, setSearch] = useState('')

  const disabledCount = users.filter((u) => u.disabled_at !== null).length
  function counterText(): string | undefined {
    if (users.length === 0) return undefined
    const total = t('users.counter.total', { count: users.length })
    if (disabledCount === 0) return total
    return t('users.counter.summary', {
      total,
      disabled: t('users.counter.disabled', { count: disabledCount }),
    })
  }

  const filtered = users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <SearchField label={t('users.search.placeholder')} value={search} onChange={setSearch} counter={counterText()} />

      {filtered.length === 0 ? (
        <Message>{t('users.empty')}</Message>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-panel">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-panel bg-panel">
                <th className={TH}>{t('users.columns.email')}</th>
                <th className={TH}>{t('users.columns.role')}</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody className="bg-white">
              {filtered.map((user) => {
                const isDisabled = user.disabled_at !== null
                const isSelf = user.email === currentUser?.email
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-border-panel last:border-0 ${isDisabled ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-body text-[0.875rem] text-navy">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{user.email}</span>
                        {isSelf && <Badge variant="caps">{t('users.you')}</Badge>}
                        {isDisabled && (
                          <Badge variant="muted">{t('users.status.disabled')}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === 'customer_admin' ? 'solid' : 'outline'}>
                        {t(`users.role.${user.role}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isDisabled && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={t('users.actions.editRole')}
                            className="rounded-md p-1.5 text-gray transition-colors hover:bg-panel hover:text-navy focus-ring"
                            onClick={() => onEditRole(user)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            aria-label={t('users.actions.disable')}
                            disabled={isSelf}
                            className="rounded-md p-1.5 text-critical transition-colors hover:bg-critical/10 focus-ring disabled:cursor-not-allowed disabled:opacity-30"
                            onClick={() => onDisable(user)}
                          >
                            <BanIcon />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const KEYS = {
  loading: 'users.loading',
  failed: 'users.loadFailed',
  network: 'users.networkError',
} as const

export function UsersPage() {
  const { t } = useTranslation()
  const usersQuery = useUsersQuery()
  const [inviteOpen, setInviteOpen] = useState(false)
  const roleDialog = useDialogTarget<UserResponse>()
  const disableDialog = useDialogTarget<UserResponse>()

  return (
    <Page title={t('users.title')}>
      <QueryBoundary query={usersQuery} keys={KEYS}>
        {({ users }) => <UserTable users={users} onEditRole={roleDialog.show} onDisable={disableDialog.show} />}
      </QueryBoundary>

      <Fab label={t('users.invite.button')} onClick={() => setInviteOpen(true)} />

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <InviteBody onClose={() => setInviteOpen(false)} />
      </Modal>
      <TargetModal dialog={roleDialog}>
        {(user) => <ChangeRoleBody user={user} onClose={roleDialog.close} />}
      </TargetModal>
      <TargetModal dialog={disableDialog}>
        {(user) => <DisableBody user={user} onClose={disableDialog.close} />}
      </TargetModal>
    </Page>
  )
}
