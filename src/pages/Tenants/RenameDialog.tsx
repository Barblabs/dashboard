import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useRenameCustomerMutation, type CustomerResponse } from '../../api/customers'
import { Button } from '../../components/ui/Button'
import { DialogLayout, TargetModal } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import type { DialogTarget } from '../../components/ui/useDialogTarget'
import { requestErrorText } from '../../i18n/errors'
import { nameSchema, type NameFields } from './customerName'

export function RenameDialog({ dialog }: { dialog: DialogTarget<CustomerResponse> }) {
  return (
    <TargetModal dialog={dialog}>
      {(customer) => <RenameBody customer={customer} onClose={dialog.close} />}
    </TargetModal>
  )
}

function RenameBody({ customer, onClose }: { customer: CustomerResponse; onClose: () => void }) {
  const { t } = useTranslation()
  const rename = useRenameCustomerMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameFields>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: customer.name },
  })

  const onSubmit = handleSubmit((data) =>
    rename.mutate({ id: customer.id, name: data.name }, { onSuccess: onClose }),
  )

  return (
    <DialogLayout
      title={t('tenants.rename.title')}
      error={requestErrorText(rename.error, t, { fallback: 'tenants.rename.failed' })}
      onSubmit={onSubmit}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('tenants.rename.cancel')}
          </Button>
          <Button type="submit" loading={rename.isPending} size="sm">
            {t('tenants.rename.save')}
          </Button>
        </>
      }
    >
      <Field
        label={t('tenants.rename.label')}
        error={errors.name?.message ? t(errors.name.message as 'tenants.create.step1.required') : undefined}
      >
        <Input disabled={rename.isPending} {...register('name')} />
      </Field>
    </DialogLayout>
  )
}
