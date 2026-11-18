import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCustomersQuery, type CustomerResponse } from '../../api/customers'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Fab } from '../../components/ui/Fab'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { CreateDialog } from './CreateDialog'
import { CustomerGrid } from './CustomerGrid'
import { DeactivateDialog } from './DeactivateDialog'
import { RenameDialog } from './RenameDialog'

const KEYS = {
  loading: 'tenants.loading',
  failed: 'tenants.loadFailed',
  network: 'tenants.networkError',
} as const

export function TenantsPage() {
  const { t } = useTranslation()
  const customersQuery = useCustomersQuery()
  const [createOpen, setCreateOpen] = useState(false)
  const renameDialog = useDialogTarget<CustomerResponse>()
  const deactivateDialog = useDialogTarget<CustomerResponse>()

  return (
    <Page title={t('tenants.title')}>
      <QueryBoundary query={customersQuery} keys={KEYS}>
        {({ customers }) => (
          <CustomerGrid customers={customers} onRename={renameDialog.show} onDeactivate={deactivateDialog.show} />
        )}
      </QueryBoundary>

      <Fab label={t('tenants.create.button')} onClick={() => setCreateOpen(true)} />

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <RenameDialog dialog={renameDialog} />
      <DeactivateDialog dialog={deactivateDialog} />
    </Page>
  )
}
