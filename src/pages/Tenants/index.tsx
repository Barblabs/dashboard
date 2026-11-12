import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  useCreateCustomerMutation,
  useCustomersQuery,
  useDeactivateCustomerMutation,
  useReactivateCustomerMutation,
  useRenameCustomerMutation,
  type CustomerResponse,
} from '../../api/customers'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog, DialogLayout, TargetModal } from '../../components/ui/Dialog'
import { Fab } from '../../components/ui/Fab'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { PencilIcon, PowerOffIcon, RestoreIcon } from '../../components/ui/icons'
import { Message } from '../../components/ui/Message'
import { Modal } from '../../components/ui/Modal'
import { SearchField } from '../../components/ui/SearchField'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'

// ── Rename dialog ─────────────────────────────────────────────────────────────

const nameSchema = z.object({
  name: z.string().trim().min(1, 'tenants.create.step1.required'),
})
type NameFields = z.infer<typeof nameSchema>

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

// ── Deactivate confirmation dialog ────────────────────────────────────────────

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

// ── Create wizard dialog ──────────────────────────────────────────────────────

const emailSchema = z.object({
  admin_email: z.string().trim().min(1, 'tenants.create.step2.required').email('tenants.create.step2.invalid'),
})
type EmailFields = z.infer<typeof emailSchema>

// The organization's name exists only once the first step accepted it.
type CreateStep = { number: 1 } | { number: 2; name: string }

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

// ── Customer card ─────────────────────────────────────────────────────────────

function CustomerCard({
  customer,
  onRename,
  onDeactivate,
  onReactivate,
}: {
  customer: CustomerResponse
  onRename: () => void
  onDeactivate: () => void
  onReactivate: () => void
}) {
  const { t } = useTranslation()
  const formatDate = useDateFormat('numeric')
  const isDeactivated = customer.deactivated_at !== null
  const initial = customer.name[0]?.toUpperCase() ?? '?'

  const reactivate = useReactivateCustomerMutation()

  const handleReactivate = () => {
    reactivate.mutate(customer.id, { onSuccess: onReactivate })
  }

  return (
    <div
      data-testid="customer-card"
      className={`flex flex-col gap-4 rounded-xl border border-border-panel p-5 ${isDeactivated ? 'bg-panel opacity-75' : 'bg-white'}`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Initial avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy font-title text-lg font-black text-cyan">
          {initial}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={t('tenants.actions.rename')}
            className="rounded-md p-1.5 text-gray transition-colors hover:bg-panel hover:text-navy focus-ring"
            onClick={onRename}
          >
            <PencilIcon />
          </button>
          {isDeactivated ? (
            <button
              type="button"
              aria-label={t('tenants.actions.reactivate')}
              disabled={reactivate.isPending}
              className="rounded-md p-1.5 text-navy transition-colors hover:bg-panel focus-ring disabled:opacity-30"
              onClick={handleReactivate}
            >
              <RestoreIcon />
            </button>
          ) : (
            <button
              type="button"
              aria-label={t('tenants.actions.deactivate')}
              className="rounded-md p-1.5 text-critical transition-colors hover:bg-critical/10 focus-ring"
              onClick={onDeactivate}
            >
              <PowerOffIcon />
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <h3 className="font-title text-[1rem] font-black leading-snug text-navy">
          {customer.name}
        </h3>
        <p className="mt-0.5 font-body text-[0.8125rem] text-gray">
          {t('tenants.created', {
            date: formatDate(customer.created_at),
          })}
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${isDeactivated ? 'bg-muted-bg' : 'bg-cyan'}`}
        />
        <span className={`font-body text-[0.8125rem] ${isDeactivated ? 'text-gray' : 'text-navy'}`}>
          {isDeactivated ? t('tenants.status.deactivated') : t('tenants.status.active')}
        </span>
      </div>
    </div>
  )
}

// ── Customer grid ─────────────────────────────────────────────────────────────

function CustomerGrid({
  customers,
  onRename,
  onDeactivate,
}: {
  customers: CustomerResponse[]
  onRename: (customer: CustomerResponse) => void
  onDeactivate: (customer: CustomerResponse) => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  const deactivatedCount = customers.filter((c) => c.deactivated_at !== null).length

  const counter =
    customers.length > 0
      ? `${customers.length} ${t('tenants.counter.organizations')}` +
        (deactivatedCount > 0 ? ` · ${deactivatedCount} ${t('tenants.counter.deactivated')}` : '')
      : ''

  return (
    <>
      <SearchField label={t('tenants.search.placeholder')} value={search} onChange={setSearch} counter={counter} />

      {filtered.length === 0 ? (
        <Message>{t('tenants.empty')}</Message>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onRename={() => onRename(customer)}
              onDeactivate={() => onDeactivate(customer)}
              onReactivate={() => {/* cache update handled inside CustomerCard */}}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <CreateBody onClose={() => setCreateOpen(false)} />
      </Modal>
      <TargetModal dialog={renameDialog}>
        {(customer) => <RenameBody customer={customer} onClose={renameDialog.close} />}
      </TargetModal>
      <TargetModal dialog={deactivateDialog}>
        {(customer) => <DeactivateBody customer={customer} onClose={deactivateDialog.close} />}
      </TargetModal>
    </Page>
  )
}
