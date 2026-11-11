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
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { requestErrorText } from '../../i18n/errors'

const ROLE_LABEL: Record<CustomerRole, 'users.role.customer_admin' | 'users.role.viewer'> = {
  customer_admin: 'users.role.customer_admin',
  viewer: 'users.role.viewer',
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M9.917 1.75a1.65 1.65 0 0 1 2.333 2.333L4.083 12.25 1.167 12.833l.583-2.916L9.917 1.75z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.757 3.757l8.486 8.486" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
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
            <select
              className="h-10 w-full rounded-lg border border-border-panel bg-white px-3 font-body text-[0.9375rem] text-navy focus-ring disabled:opacity-50"
              disabled={invite.isPending}
              {...register('role')}
            >
              <option value="viewer">{t(ROLE_LABEL['viewer'])}</option>
              <option value="customer_admin">{t(ROLE_LABEL['customer_admin'])}</option>
            </select>
          </Field>

          <p className="rounded-md border border-border-panel bg-panel px-4 py-3 font-body text-[0.8125rem] text-gray">
            {t('users.invite.tempPasswordNotice')}
          </p>
        </div>

        {errorText && (
          <p
            role="alert"
            className="rounded-md border border-critical bg-critical/5 px-4 py-3 font-body text-[0.875rem] text-critical"
          >
            {errorText}
          </p>
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
          <select
            className="h-10 w-full rounded-lg border border-border-panel bg-white px-3 font-body text-[0.9375rem] text-navy focus-ring disabled:opacity-50"
            value={selectedRole}
            disabled={changeRole.isPending}
            onChange={(e) => {
              changeRole.reset()
              setSelectedRole(e.target.value as CustomerRole)
            }}
          >
            <option value="viewer">{t(ROLE_LABEL['viewer'])}</option>
            <option value="customer_admin">{t(ROLE_LABEL['customer_admin'])}</option>
          </select>
        </Field>

        {errorText && (
          <p
            role="alert"
            className="rounded-md border border-critical bg-critical/5 px-4 py-3 font-body text-[0.875rem] text-critical"
          >
            {errorText}
          </p>
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
          <p
            role="alert"
            className="rounded-md border border-critical bg-critical/5 px-4 py-3 font-body text-[0.875rem] text-critical"
          >
            {errorText}
          </p>
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

// ── Page ─────────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const usersQuery = useUsersQuery()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<UserResponse | null>(null)
  const [disableTarget, setDisableTarget] = useState<UserResponse | null>(null)

  const TH =
    'px-4 py-3 font-body text-[0.75rem] font-semibold uppercase tracking-wider text-gray text-left'

  const users = usersQuery.data?.users ?? []
  const disabledCount = users.filter((u) => u.disabled_at !== null).length
  const counter =
    users.length > 0
      ? `${users.length} ${users.length === 1 ? t('users.counter.user') : t('users.counter.users')}` +
        (disabledCount > 0
          ? ` · ${disabledCount} ${disabledCount === 1 ? t('users.counter.disabled') : t('users.counter.disabledMany')}`
          : '')
      : ''

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8">
      <header>
        <h1 className="font-title text-[1.875rem] leading-[1.15] tracking-[-0.01em] text-navy">
          {t('users.title')}
        </h1>
      </header>

      {usersQuery.isPending ? (
        <p className="py-12 text-center font-body text-[0.875rem] text-gray">{t('users.loading')}</p>
      ) : usersQuery.isError ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="font-body text-[0.875rem] text-critical">{t('users.loadFailed')}</p>
          <Button variant="secondary" size="sm" onClick={() => void usersQuery.refetch()}>
            {t('users.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray"
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.25" stroke="currentColor" strokeWidth="1.4" />
                  <path
                    d="m11 11 2.5 2.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                type="search"
                placeholder={t('users.search.placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border-panel bg-white py-2.5 pl-9 pr-3 font-body text-[0.9375rem] text-navy outline-none transition-[border-color] duration-150 ease-[ease] focus:border-navy focus-ring"
              />
            </div>
            {counter && (
              <p className="shrink-0 font-body text-[0.875rem] text-gray">{counter}</p>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="py-12 text-center font-body text-[0.875rem] text-gray">
              {t('users.empty')}
            </p>
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
                                onClick={() => setRoleTarget(user)}
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                aria-label={t('users.actions.disable')}
                                disabled={isSelf}
                                className="rounded-md p-1.5 text-critical transition-colors hover:bg-critical/10 focus-ring disabled:cursor-not-allowed disabled:opacity-30"
                                onClick={() => setDisableTarget(user)}
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
      )}

      {/* FAB */}
      <button
        type="button"
        aria-label={t('users.invite.button')}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-transform hover:scale-105 focus-ring"
        onClick={() => setInviteOpen(true)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

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
    </main>
  )
}
