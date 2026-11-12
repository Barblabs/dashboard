import { useId, useState } from 'react'
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
import { Fab } from '../../components/ui/Fab'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { PencilIcon, PowerOffIcon, RestoreIcon } from '../../components/ui/icons'
import { Modal } from '../../components/ui/Modal'
import { SearchField } from '../../components/ui/SearchField'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'

// ── Rename modal ──────────────────────────────────────────────────────────────

const nameSchema = z.object({
  name: z.string().trim().min(1, 'tenants.create.step1.required'),
})
type NameFields = z.infer<typeof nameSchema>

function RenameModal({
  customer,
  open,
  onClose,
}: {
  customer: CustomerResponse | null
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const rename = useRenameCustomerMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NameFields>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: customer?.name ?? '' },
  })

  const handleClose = () => {
    reset()
    rename.reset()
    onClose()
  }

  const onSubmit = handleSubmit((data) => {
    if (!customer) return
    rename.mutate({ id: customer.id, name: data.name }, { onSuccess: handleClose })
  })

  const errorText = rename.isError
    ? requestErrorText(rename.error, t, { fallback: 'tenants.rename.failed' })
    : null

  return (
    <Modal open={open} onClose={handleClose} labelledBy={titleId}>
      <div className="flex flex-col gap-5 p-6">
        <h2 id={titleId} className="font-title text-[1.25rem] leading-tight text-navy">
          {t('tenants.rename.title')}
        </h2>

        <Field
          label={t('tenants.rename.label')}
          error={errors.name?.message ? t(errors.name.message as 'tenants.create.step1.required') : undefined}
        >
          <Input disabled={rename.isPending} {...register('name')} />
        </Field>

        {errorText && (
          <Alert tone="error">{errorText}</Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            {t('tenants.rename.cancel')}
          </Button>
          <Button loading={rename.isPending} size="sm" onClick={onSubmit}>
            {t('tenants.rename.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Deactivate confirmation modal ─────────────────────────────────────────────

function DeactivateModal({
  customer,
  open,
  onClose,
}: {
  customer: CustomerResponse | null
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const deactivate = useDeactivateCustomerMutation()

  const handleClose = () => {
    deactivate.reset()
    onClose()
  }

  const errorText = deactivate.isError
    ? requestErrorText(deactivate.error, t, { fallback: 'tenants.deactivate.failed' })
    : null

  return (
    <Modal open={open} onClose={handleClose} labelledBy={titleId}>
      <div className="flex flex-col gap-5 p-6">
        <h2 id={titleId} className="font-title text-[1.25rem] leading-tight text-navy">
          {t('tenants.deactivate.title')}
        </h2>

        <p className="font-body text-[0.9375rem] text-navy">{t('tenants.deactivate.body')}</p>

        {errorText && (
          <Alert tone="error">{errorText}</Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            {t('tenants.deactivate.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={deactivate.isPending}
            size="sm"
            onClick={() => {
              if (!customer) return
              deactivate.mutate(customer.id, { onSuccess: handleClose })
            }}
          >
            {t('tenants.deactivate.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Create wizard modal ───────────────────────────────────────────────────────

const emailSchema = z.object({
  admin_email: z.string().trim().min(1, 'tenants.create.step2.required').email('tenants.create.step2.invalid'),
})
type EmailFields = z.infer<typeof emailSchema>

// The organization's name exists only once the first step accepted it.
type CreateStep = { number: 1 } | { number: 2; name: string }

const NAME_STEP: CreateStep = { number: 1 }

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const titleId = useId()
  const create = useCreateCustomerMutation()
  const [current, setCurrent] = useState<CreateStep>(NAME_STEP)
  const step = current.number

  const step1Form = useForm<NameFields>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: '' },
  })
  const step2Form = useForm<EmailFields>({
    resolver: zodResolver(emailSchema),
    defaultValues: { admin_email: '' },
  })

  const handleClose = () => {
    step1Form.reset()
    step2Form.reset()
    create.reset()
    setCurrent(NAME_STEP)
    onClose()
  }

  const handleNext = step1Form.handleSubmit((data) => setCurrent({ number: 2, name: data.name }))

  const handleSubmit = step2Form.handleSubmit((data) => {
    if (current.number !== 2) return
    create.mutate({ name: current.name, admin_email: data.admin_email }, { onSuccess: handleClose })
  })

  const errorText = create.isError
    ? requestErrorText(create.error, t, { fallback: 'tenants.create.failed' })
    : null

  const stepTitle = step === 1 ? t('tenants.create.step1.title') : t('tenants.create.step2.title')

  return (
    <Modal open={open} onClose={handleClose} labelledBy={titleId}>
      <div className="flex flex-col gap-5 p-6">
        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] font-semibold ${step === 1 ? 'bg-navy text-white' : 'bg-panel text-gray'}`}
            >
              1
            </div>
            <div className="h-px w-8 bg-border-panel" />
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] font-semibold ${step === 2 ? 'bg-navy text-white' : 'bg-panel text-gray'}`}
            >
              2
            </div>
          </div>
          <span className="font-body text-[0.75rem] text-gray">
            {t('tenants.create.step', { current: step, total: 2 })}
          </span>
        </div>

        <h2 id={titleId} className="font-title text-[1.25rem] leading-tight text-navy">
          {stepTitle}
        </h2>

        {step === 1 && (
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
        )}

        {step === 2 && (
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
        )}

        {errorText && (
          <Alert tone="error">{errorText}</Alert>
        )}

        <div className="flex justify-end gap-2">
          {step === 2 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                create.reset()
                setCurrent(NAME_STEP)
              }}
            >
              {t('tenants.create.step2.back')}
            </Button>
          )}
          {step === 1 ? (
            <Button size="sm" onClick={handleNext}>
              {t('tenants.create.step1.next')}
            </Button>
          ) : (
            <Button loading={create.isPending} size="sm" onClick={handleSubmit}>
              {create.isPending ? t('tenants.create.step2.submitting') : t('tenants.create.step2.submit')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
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
        <p className="py-12 text-center font-body text-[0.875rem] text-gray">{t('tenants.empty')}</p>
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
  retry: 'tenants.retry',
} as const

export function TenantsPage() {
  const { t } = useTranslation()
  const customersQuery = useCustomersQuery()
  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<CustomerResponse | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<CustomerResponse | null>(null)

  return (
    <Page title={t('tenants.title')}>
      <QueryBoundary query={customersQuery} keys={KEYS}>
        {({ customers }) => (
          <CustomerGrid customers={customers} onRename={setRenameTarget} onDeactivate={setDeactivateTarget} />
        )}
      </QueryBoundary>

      <Fab label={t('tenants.create.button')} onClick={() => setCreateOpen(true)} />

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <RenameModal
        key={renameTarget?.id ?? ''}
        customer={renameTarget}
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
      />
      <DeactivateModal
        customer={deactivateTarget}
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
      />
    </Page>
  )
}
