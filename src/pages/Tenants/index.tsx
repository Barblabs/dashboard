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
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { requestErrorText } from '../../i18n/errors'

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

function PowerOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.5 3.5A6 6 0 1 0 10.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 1.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function RestoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 8A5.5 5.5 0 1 1 4 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M2.5 12.5V8H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
          <p role="alert" className="rounded-md border border-critical bg-critical/5 px-4 py-3 font-body text-[0.875rem] text-critical">
            {errorText}
          </p>
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
          <p role="alert" className="rounded-md border border-critical bg-critical/5 px-4 py-3 font-body text-[0.875rem] text-critical">
            {errorText}
          </p>
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

            <p className="rounded-md border border-border-panel bg-panel px-4 py-3 font-body text-[0.8125rem] text-gray">
              {t('tenants.create.step2.notice')}
            </p>
          </div>
        )}

        {errorText && (
          <p role="alert" className="rounded-md border border-critical bg-critical/5 px-4 py-3 font-body text-[0.875rem] text-critical">
            {errorText}
          </p>
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
  const { t, i18n } = useTranslation()
  const isDeactivated = customer.deactivated_at !== null
  const language = i18n.resolvedLanguage ?? i18n.language
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
            date: new Date(customer.created_at).toLocaleDateString(language),
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

// ── Page ──────────────────────────────────────────────────────────────────────

export function TenantsPage() {
  const { t } = useTranslation()
  const customersQuery = useCustomersQuery()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<CustomerResponse | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<CustomerResponse | null>(null)

  const customers = customersQuery.data?.customers ?? []
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )
  const deactivatedCount = customers.filter((c) => c.deactivated_at !== null).length

  const counter =
    customers.length > 0
      ? `${customers.length} ${t('tenants.counter.organizations')}` +
        (deactivatedCount > 0 ? ` · ${deactivatedCount} ${t('tenants.counter.deactivated')}` : '')
      : ''

  return (
    <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8">
      <header>
        <h1 className="font-title text-[1.875rem] leading-[1.15] tracking-[-0.01em] text-navy">
          {t('tenants.title')}
        </h1>
      </header>

      {customersQuery.isPending ? (
        <p className="py-12 text-center font-body text-[0.875rem] text-gray">{t('tenants.loading')}</p>
      ) : customersQuery.isError ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="font-body text-[0.875rem] text-critical">{t('tenants.loadFailed')}</p>
          <Button variant="secondary" size="sm" onClick={() => void customersQuery.refetch()}>
            {t('tenants.retry')}
          </Button>
        </div>
      ) : (
        <>
          {/* Search + counter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.25" stroke="currentColor" strokeWidth="1.4" />
                  <path d="m11 11 2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                placeholder={t('tenants.search.placeholder')}
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
            <p className="py-12 text-center font-body text-[0.875rem] text-gray">{t('tenants.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onRename={() => setRenameTarget(customer)}
                  onDeactivate={() => setDeactivateTarget(customer)}
                  onReactivate={() => {/* cache update handled inside CustomerCard */}}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button
        type="button"
        aria-label={t('tenants.create.button')}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-transform hover:scale-105 focus-ring"
        onClick={() => setCreateOpen(true)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

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
    </main>
  )
}
