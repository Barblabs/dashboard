import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsersQuery, type UserResponse } from '../../api/users'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Fab } from '../../components/ui/Fab'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { ChangeRoleDialog } from './ChangeRoleDialog'
import { DisableDialog } from './DisableDialog'
import { InviteDialog } from './InviteDialog'
import { UserTable } from './UserTable'

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

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ChangeRoleDialog dialog={roleDialog} />
      <DisableDialog dialog={disableDialog} />
    </Page>
  )
}
