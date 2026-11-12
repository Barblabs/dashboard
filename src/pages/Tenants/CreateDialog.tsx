import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useCreateCustomerMutation } from '../../api/customers'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { DialogLayout } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { requestErrorText } from '../../i18n/errors'
import { nameSchema, type NameFields } from './customerName'

const emailSchema = z.object({
  admin_email: z.string().trim().min(1, 'tenants.create.step2.required').email('tenants.create.step2.invalid'),
})
type EmailFields = z.infer<typeof emailSchema>

// The organization's name exists only once the first step accepted it.
type CreateStep = { number: 1 } | { number: 2; name: string }

export function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <CreateBody onClose={onClose} />
    </Modal>
  )
}

function StepIndicator({ step }: { step: CreateStep['number'] }) {
  const { t } = useTranslation()
  const dot = (n: CreateStep['number']) =>
    `flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] font-semibold ${step === n ? 'bg-navy text-white' : 'bg-panel text-gray'}`

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={dot(1)}>1</div>
        <div className="h-px w-8 bg-border-panel" />
        <div className={dot(2)}>2</div>
      </div>
      <span className="font-body text-[0.75rem] text-gray">
        {t('tenants.create.step', { current: step, total: 2 })}
      </span>
    </div>
  )
}

function CreateBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const create = useCreateCustomerMutation()
  const [current, setCurrent] = useState<CreateStep>({ number: 1 })

  const step1Form = useForm<NameFields>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: '' },
  })
  const step2Form = useForm<EmailFields>({
    resolver: zodResolver(emailSchema),
    defaultValues: { admin_email: '' },
  })

  const handleNext = step1Form.handleSubmit((data) => setCurrent({ number: 2, name: data.name }))

  const handleBack = () => {
    create.reset()
    setCurrent({ number: 1 })
  }

  if (current.number === 1) {
    return (
      <DialogLayout
        eyebrow={<StepIndicator step={1} />}
        title={t('tenants.create.step1.title')}
        onSubmit={handleNext}
        actions={
          <Button type="submit" size="sm">
            {t('tenants.create.step1.next')}
          </Button>
        }
      >
        <Field
          label={t('tenants.create.step1.label')}
          error={
            step1Form.formState.errors.name?.message
              ? t(step1Form.formState.errors.name.message as 'tenants.create.step1.required')
              : undefined
          }
        >
          <Input
            placeholder={t('tenants.create.step1.placeholder')}
            autoFocus
            {...step1Form.register('name')}
          />
        </Field>
      </DialogLayout>
    )
  }

  const { name } = current
  const handleSubmit = step2Form.handleSubmit((data) =>
    create.mutate({ name, admin_email: data.admin_email }, { onSuccess: onClose }),
  )

  return (
    <DialogLayout
      eyebrow={<StepIndicator step={2} />}
      title={t('tenants.create.step2.title')}
      error={requestErrorText(create.error, t, { fallback: 'tenants.create.failed' })}
      onSubmit={handleSubmit}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={handleBack}>
            {t('tenants.create.step2.back')}
          </Button>
          <Button type="submit" loading={create.isPending} size="sm">
            {create.isPending ? t('tenants.create.step2.submitting') : t('tenants.create.step2.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label={t('tenants.create.step2.label')}
          error={
            step2Form.formState.errors.admin_email?.message
              ? t(step2Form.formState.errors.admin_email.message as 'tenants.create.step2.required')
              : undefined
          }
        >
          <Input
            type="email"
            placeholder="admin@empresa.com"
            autoComplete="off"
            disabled={create.isPending}
            autoFocus
            {...step2Form.register('admin_email')}
          />
        </Field>

        <Alert tone="info">{t('tenants.create.step2.notice')}</Alert>
      </div>
    </DialogLayout>
  )
}
