import { useId, useState } from 'react'
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
import { Fab } from '../../components/ui/Fab'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { BanIcon, PencilIcon } from '../../components/ui/icons'
import { Message } from '../../components/ui/Message'
import { Modal } from '../../components/ui/Modal'
import { SearchField } from '../../components/ui/SearchField'
import { Select } from '../../components/ui/Select'
import { requestErrorText } from '../../i18n/errors'

const ROLE_LABEL: Record<CustomerRole, 'users.role.customer_admin' | 'users.role.viewer'> = {
  customer_admin: 'users.role.customer_admin',
  viewer: 'users.role.viewer',
}

// ── Invite modal ────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().trim().min(1, 'users.invite.email.required').email('users.invite.email.invalid'),
  role: z.enum(['customer_admin', 'viewer']),
})
type InviteFields = z.infer<typeof inviteSchema>

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const titleId = useId()
  const invite = useInviteUserMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteFields>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'viewer' },
  })

  const handleClose = () => {
    reset()
    invite.reset()
    onClose()
  }

  const onSubmit = handleSubmit((data) => invite.mutate(data, { onSuccess: handleClose }))

  const errorText = invite.isError
    ? requestErrorText(invite.error, t, { fallback: 'users.invite.failed' })
    : null

  return (
    <Modal open={open} onClose={handleClose} labelledBy={titleId}>
      <div className="flex flex-col gap-5 p-6">
        <h2 id={titleId} className="font-title text-[1.25rem] leading-tight text-navy">
          {t('users.invite.title')}
        </h2>

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
              <option value="viewer">{t(ROLE_LABEL['viewer'])}</option>
              <option value="customer_admin">{t(ROLE_LABEL['customer_admin'])}</option>
            </Select>
          </Field>

          <Alert tone="info">{t('users.invite.tempPasswordNotice')}</Alert>
        </div>

        {errorText && (
          <Alert tone="error">{errorText}</Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            {t('users.invite.cancel')}
          </Button>
          <Button loading={invite.isPending} size="sm" onClick={onSubmit}>
            {invite.isPending ? t('users.invite.submitting') : t('users.invite.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Change-role modal ────────────────────────────────────────────────────────

function ChangeRoleModal({
  user,
  open,
  onClose,
}: {
  user: UserResponse | null
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const changeRole = useChangeRoleMutation()
  const [selectedRole, setSelectedRole] = useState<CustomerRole>(user?.role ?? 'viewer')

  const handleClose = () => {
    changeRole.reset()
    onClose()
  }

  const errorText = changeRole.isError
    ? requestErrorText(changeRole.error, t, { fallback: 'users.actions.roleChangeFailed' })
    : null

  return (
    <Modal open={open} onClose={handleClose} labelledBy={titleId}>
      <div className="flex flex-col gap-5 p-6">
        <h2 id={titleId} className="font-title text-[1.25rem] leading-tight text-navy">
          {t('users.changeRole.title')}
        </h2>

        <Field label={t('users.invite.role.label')}>
          <Select
            value={selectedRole}
            disabled={changeRole.isPending}
            onChange={(e) => {
              changeRole.reset()
              setSelectedRole(e.target.value as CustomerRole)
            }}
          >
            <option value="viewer">{t(ROLE_LABEL['viewer'])}</option>
            <option value="customer_admin">{t(ROLE_LABEL['customer_admin'])}</option>
          </Select>
        </Field>

        {errorText && (
          <Alert tone="error">{errorText}</Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            {t('users.confirm.cancel')}
          </Button>
          <Button
            loading={changeRole.isPending}
            size="sm"
            onClick={() => {
              if (!user) return
              changeRole.mutate({ id: user.id, role: selectedRole }, { onSuccess: handleClose })
            }}
          >
            {t('users.changeRole.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Disable-user modal ───────────────────────────────────────────────────────

function DisableModal({
  user,
  open,
  onClose,
}: {
  user: UserResponse | null
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const disable = useDisableUserMutation()

  const handleClose = () => {
    disable.reset()
    onClose()
  }

  const errorText = disable.isError
    ? requestErrorText(disable.error, t, { fallback: 'users.actions.disableFailed' })
    : null

  return (
    <Modal open={open} onClose={handleClose} labelledBy={titleId}>
      <div className="flex flex-col gap-5 p-6">
        <h2 id={titleId} className="font-title text-[1.25rem] leading-tight text-navy">
          {t('users.disable.title')}
        </h2>

        <p className="font-body text-[0.9375rem] text-navy">{t('users.confirm.text')}</p>

        {errorText && (
          <Alert tone="error">{errorText}</Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            {t('users.confirm.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={disable.isPending}
            size="sm"
            onClick={() => {
              if (!user) return
              disable.mutate(user.id, { onSuccess: handleClose })
            }}
          >
            {t('users.confirm.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
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
  const counter =
    users.length > 0
      ? `${users.length} ${users.length === 1 ? t('users.counter.user') : t('users.counter.users')}` +
        (disabledCount > 0
          ? ` · ${disabledCount} ${disabledCount === 1 ? t('users.counter.disabled') : t('users.counter.disabledMany')}`
          : '')
      : ''

  const filtered = users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <SearchField label={t('users.search.placeholder')} value={search} onChange={setSearch} counter={counter} />

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
                        {t(ROLE_LABEL[user.role])}
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
  retry: 'users.retry',
} as const

export function UsersPage() {
  const { t } = useTranslation()
  const usersQuery = useUsersQuery()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<UserResponse | null>(null)
  const [disableTarget, setDisableTarget] = useState<UserResponse | null>(null)

  return (
    <Page title={t('users.title')}>
      <QueryBoundary query={usersQuery} keys={KEYS}>
        {({ users }) => <UserTable users={users} onEditRole={setRoleTarget} onDisable={setDisableTarget} />}
      </QueryBoundary>

      <Fab label={t('users.invite.button')} onClick={() => setInviteOpen(true)} />

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ChangeRoleModal
        key={roleTarget?.id ?? ''}
        user={roleTarget}
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
      />
      <DisableModal
        user={disableTarget}
        open={disableTarget !== null}
        onClose={() => setDisableTarget(null)}
      />
    </Page>
  )
}
