import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { UserResponse } from '../../api/users'
import { useCurrentUser } from '../../auth/store'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { BanIcon, PencilIcon } from '../../components/ui/icons'
import { Message } from '../../components/ui/Message'
import { SearchField } from '../../components/ui/SearchField'

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

const TH = 'px-4 py-3 font-body text-[0.75rem] font-semibold uppercase tracking-wider text-gray text-left'

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
                const status = userStatus(user)
                const isDisabled = status === 'disabled'
                const isSelf = user.email === currentUser?.email
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-border-panel last:border-0 ${isDisabled ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-body text-[0.875rem] text-navy">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* An email has no break points: without this it widens the table and pushes the actions out of view. */}
                        <span className="min-w-0 wrap-anywhere">{user.email}</span>
                        {isSelf && <Badge variant="caps">{t('users.you')}</Badge>}
                        {status !== 'active' && (
                          <Badge variant={STATUS_BADGE[status]}>{t(`users.status.${status}`)}</Badge>
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
