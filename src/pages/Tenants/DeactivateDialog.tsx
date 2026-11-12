import { useTranslation } from 'react-i18next'
import { useDeactivateCustomerMutation, type CustomerResponse } from '../../api/customers'
import { ConfirmDialog, TargetModal } from '../../components/ui/Dialog'
import type { DialogTarget } from '../../components/ui/useDialogTarget'
import { requestErrorText } from '../../i18n/errors'

export function DeactivateDialog({ dialog }: { dialog: DialogTarget<CustomerResponse> }) {
  return (
    <TargetModal dialog={dialog}>
      {(customer) => <DeactivateBody customer={customer} onClose={dialog.close} />}
    </TargetModal>
  )
}

function DeactivateBody({ customer, onClose }: { customer: CustomerResponse; onClose: () => void }) {
  const { t } = useTranslation()
  const deactivate = useDeactivateCustomerMutation()

  return (
    <ConfirmDialog
      title={t('tenants.deactivate.title')}
      text={t('tenants.deactivate.body')}
      cancelLabel={t('tenants.deactivate.cancel')}
      confirmLabel={t('tenants.deactivate.confirm')}
      pending={deactivate.isPending}
      error={requestErrorText(deactivate.error, t, { fallback: 'tenants.deactivate.failed' })}
      onConfirm={() => deactivate.mutate(customer.id, { onSuccess: onClose })}
      onCancel={onClose}
    />
  )
}
