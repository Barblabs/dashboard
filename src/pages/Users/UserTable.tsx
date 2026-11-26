import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserResponse } from '../../api/users'
import { useCurrentUser } from '../../auth/store'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { BanIcon, PencilIcon } from '../../components/ui/icons'
import { Message } from '../../components/ui/Message'
import { SearchField } from '../../components/ui/SearchField'
import { CELL, HEADER_CELL, HEADER_ROW } from '../../components/ui/table'
import { useWideLayout } from '../../components/ui/useWideLayout'

type UserStatus = 'disabled' | 'pending' | 'active'

// Disabled wins: a disabled User cannot sign in whether or not their invitation went out.
function userStatus(user: UserResponse): UserStatus {
  if (user.disabled_at !== null) return 'disabled'
  return user.pending ? 'pending' : 'active'
}

const STATUS_BADGE: Record<Exclude<UserStatus, 'active'>, BadgeVariant> = {
  disabled: 'muted',
  pending: 'warning',
}

export function UserTable({
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
  const wide = useWideLayout()
  const [search, setSearch] = useState('')

  const disabledCount = users.filter((u) => userStatus(u) === 'disabled').length
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
        <Message>{users.length === 0 ? t('users.empty') : t('users.noMatches')}</Message>
      ) : wide ? (
        <div className="shrink-0 overflow-hidden rounded-xl border border-border-panel bg-white">
          <table className="w-full border-collapse text-[0.875rem]">
            <thead>
              <tr className={HEADER_ROW}>
                <th className={HEADER_CELL}>{t('users.columns.email')}</th>
                <th className={HEADER_CELL}>{t('users.columns.role')}</th>
                <th className={HEADER_CELL} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isSelf = user.email === currentUser?.email
                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-row-hover [&:last-child>td]:border-0 ${userStatus(user) === 'disabled' ? '*:opacity-50 contrast-more:*:opacity-100' : ''}`}
                  >
                    <td className={CELL}>
                      <UserIdentity user={user} isSelf={isSelf} />
                    </td>
                    <td className={CELL}>
                      <RoleBadge user={user} />
                    </td>
                    <td className={`${CELL} text-right`}>
                      <UserActions user={user} isSelf={isSelf} onEditRole={onEditRole} onDisable={onDisable} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((user) => {
            const isSelf = user.email === currentUser?.email
            return (
              <li
                key={user.id}
                className={`flex flex-col gap-3 rounded-lg border border-border-panel bg-white p-4 text-[0.875rem] text-navy ${userStatus(user) === 'disabled' ? '*:opacity-50 contrast-more:*:opacity-100' : ''}`}
              >
                <UserIdentity user={user} isSelf={isSelf} />
                <div className="flex items-center justify-between gap-2">
                  <RoleBadge user={user} />
                  <UserActions user={user} isSelf={isSelf} onEditRole={onEditRole} onDisable={onDisable} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function UserIdentity({ user, isSelf }: { user: UserResponse; isSelf: boolean }) {
  const { t } = useTranslation()
  const status = userStatus(user)

  return (
    <div className="flex flex-wrap items-center gap-2 font-body">
      {/* An email has no break points: without this it widens the table and pushes the actions out of view. */}
      <span className="min-w-0 wrap-anywhere">{user.email}</span>
      {isSelf && <Badge variant="quiet">{t('users.you')}</Badge>}
      {status !== 'active' && <Badge variant={STATUS_BADGE[status]}>{t(`users.status.${status}`)}</Badge>}
    </div>
  )
}

function RoleBadge({ user }: { user: UserResponse }) {
  const { t } = useTranslation()

  return (
    <Badge variant={user.role === 'customer_admin' ? 'solid' : 'outline'}>{t(`users.role.${user.role}`)}</Badge>
  )
}

function UserActions({
  user,
  isSelf,
  onEditRole,
  onDisable,
}: {
  user: UserResponse
  isSelf: boolean
  onEditRole: (user: UserResponse) => void
  onDisable: (user: UserResponse) => void
}) {
  const { t } = useTranslation()
  if (userStatus(user) === 'disabled') return null

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        aria-label={t('users.actions.editRole')}
        className="cursor-pointer rounded-md p-1.5 text-gray transition-colors hover:bg-panel hover:text-navy focus-ring"
        onClick={() => onEditRole(user)}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        aria-label={t('users.actions.disable')}
        disabled={isSelf}
        className="cursor-pointer rounded-md p-1.5 text-critical transition-colors enabled:hover:bg-critical/10 focus-ring disabled:cursor-not-allowed disabled:opacity-45"
        onClick={() => onDisable(user)}
      >
        <BanIcon />
      </button>
    </div>
  )
}
