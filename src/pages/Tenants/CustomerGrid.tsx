import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReactivateCustomerMutation, type CustomerResponse } from '../../api/customers'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { PencilIcon, PowerOffIcon, RestoreIcon } from '../../components/ui/icons'
import { Message } from '../../components/ui/Message'
import { SearchField } from '../../components/ui/SearchField'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'

function CustomerCard({
  customer,
  onRename,
  onDeactivate,
}: {
  customer: CustomerResponse
  onRename: () => void
  onDeactivate: () => void
}) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const isDeactivated = customer.deactivated_at !== null

  const reactivate = useReactivateCustomerMutation()
  const reactivateError = requestErrorText(reactivate.error, t, { fallback: 'tenants.reactivate.failed' })

  return (
    <div
      data-testid="customer-card"
      className={`flex flex-col gap-4 rounded-xl border border-border-panel p-5 ${isDeactivated ? 'bg-panel opacity-75 contrast-more:opacity-100' : 'bg-white'}`}
    >
      <div className="min-w-0">
        <h3 className="font-title text-[1rem] leading-snug text-navy">
          {customer.name}
        </h3>
        <p className="mt-0.5 font-body text-[0.8125rem] text-gray">
          {t('tenants.created', {
            date: formatDate(customer.created_at),
          })}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* The same status badge as the organizations table on the dashboard. */}
        <Badge variant={isDeactivated ? 'muted' : 'outline'}>
          {isDeactivated ? t('tenants.status.deactivated') : t('tenants.status.active')}
        </Badge>

        <div className="-my-1.5 -mr-1.5 flex items-center gap-0.5">
          <button
            type="button"
            aria-label={t('tenants.actions.rename')}
            className="cursor-pointer rounded-md p-1.5 text-gray transition-colors duration-150 ease-[ease] hover:bg-panel hover:text-navy focus-ring"
            onClick={onRename}
          >
            <PencilIcon />
          </button>
          {isDeactivated ? (
            <button
              type="button"
              aria-label={t('tenants.actions.reactivate')}
              disabled={reactivate.isPending}
              className="cursor-pointer rounded-md p-1.5 text-navy transition-colors duration-150 ease-[ease] enabled:hover:bg-panel focus-ring disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => reactivate.mutate(customer.id)}
            >
              <RestoreIcon />
            </button>
          ) : (
            <button
              type="button"
              aria-label={t('tenants.actions.deactivate')}
              className="cursor-pointer rounded-md p-1.5 text-critical transition-colors duration-150 ease-[ease] hover:bg-critical/10 focus-ring"
              onClick={onDeactivate}
            >
              <PowerOffIcon />
            </button>
          )}
        </div>
      </div>

      {reactivateError && <Alert tone="error">{reactivateError}</Alert>}
    </div>
  )
}

export function CustomerGrid({
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

  function counterText(): string | undefined {
    if (customers.length === 0) return undefined
    const total = t('tenants.counter.total', { count: customers.length })
    if (deactivatedCount === 0) return total
    return t('tenants.counter.summary', {
      total,
      deactivated: t('tenants.counter.deactivated', { count: deactivatedCount }),
    })
  }

  return (
    <>
      <SearchField label={t('tenants.search.placeholder')} value={search} onChange={setSearch} counter={counterText()} />

      {filtered.length === 0 ? (
        <Message>{customers.length === 0 ? t('tenants.empty') : t('tenants.noMatches')}</Message>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onRename={() => onRename(customer)}
              onDeactivate={() => onDeactivate(customer)}
            />
          ))}
        </div>
      )}
    </>
  )
}
