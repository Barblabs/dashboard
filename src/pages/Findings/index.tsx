import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, Navigate } from 'react-router'
import { useCurrentOrderQuery, type CurrentOrder } from '../../api/prioritizations'
import { Page } from '../../components/Page'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Message } from '../../components/ui/Message'
import { Modal } from '../../components/ui/Modal'
import { useDateFormat } from '../../i18n/format'
import { FindingDetail } from './FindingDetail'
import { FilterChips, FindingsFilterBar } from './FindingsFilter'
import { GroupPanel } from './GroupPanel'
import { hasActiveFilters, matchesFinding, parseFilters } from './filters'

const FINDING_PARAM = 'finding'

const DASHBOARD_TABS = new Set(['summary', 'before-after', 'risk', 'threats', 'closed'])

export function FindingsPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const tab = params.get('tab')

  // Legacy URLs: /findings?tab=<dashboard-tab> → /dashboard?tab=<dashboard-tab>
  if (tab && DASHBOARD_TABS.has(tab)) {
    const next = new URLSearchParams()
    next.set('tab', tab)
    return <Navigate to={`/dashboard?${next}`} replace />
  }

  return (
    <Page title={t('findings.title')} subtitle={t('findings.subtitle')}>
      <ChartErrorBoundary>
        <PrioritizedTabContent />
      </ChartErrorBoundary>
    </Page>
  )
}

function PrioritizedTabContent() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const query = useCurrentOrderQuery()
  const closeButton = useRef<HTMLButtonElement>(null)

  const setFilter = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })

  const removeChip = (key: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(key)
      if (key === 'ids' || key === 'asset' || key === 'criticality' || key === 'area') next.delete('from')
      if (!hasActiveFilters(parseFilters(next))) next.delete('from')
      return next
    })

  const clearFilters = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const k of ['band', 'exposure', 'criticality', 'asset', 'area', 'status', 'kev', 'q', 'from', 'ids']) next.delete(k)
      return next
    })

  const openId = params.get(FINDING_PARAM)

  const openFinding = (id: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(FINDING_PARAM, id)
      return next
    })

  const close = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(FINDING_PARAM)
      return next
    })

  return (
    <div className="flex flex-col gap-5">
      <FindingsFilterBar filters={filters} onFilter={setFilter} />

      <QueryBoundary
        query={query}
        keys={{ loading: 'findings.loading', failed: 'findings.failed', network: 'findings.network' }}
      >
        {(order) =>
          order ? (
            <OrderContent
              order={order}
              filters={filters}
              openId={openId}
              onOpen={openFinding}
              onClose={close}
              onRemoveChip={removeChip}
              onClearAll={clearFilters}
              closeButton={closeButton}
            />
          ) : (
            <Message>{t('findings.empty')}</Message>
          )
        }
      </QueryBoundary>
    </div>
  )
}

interface OrderContentProps {
  order: CurrentOrder
  filters: ReturnType<typeof parseFilters>
  openId: string | null
  onOpen: (id: string) => void
  onClose: () => void
  onRemoveChip: (key: string) => void
  onClearAll: () => void
  closeButton: React.RefObject<HTMLButtonElement | null>
}

function OrderContent({
  order,
  filters,
  openId,
  onOpen,
  onClose,
  onRemoveChip,
  onClearAll,
  closeButton,
}: OrderContentProps) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const { prioritization } = order

  const filteredSet = new Set(
    prioritization.findings.filter((f) => matchesFinding(f, filters)).map((f) => f.finding_id),
  )
  const filteredGroups = prioritization.groups
    .map((g) => ({ ...g, finding_ids: g.finding_ids.filter((id) => filteredSet.has(id)) }))
    .filter((g) => g.finding_ids.length > 0)

  const open = prioritization.findings.find((f) => f.finding_id === openId)

  return (
    <>
      <p className="flex flex-wrap gap-x-3 gap-y-1 font-body text-[0.875rem] text-gray">
        <span>{t('findings.summary.updated', { date: formatDate(prioritization.created_at) })}</span>
        <span aria-hidden="true">·</span>
        <span>
          {prioritization.business_context_version === null
            ? t('findings.summary.noBusinessContext')
            : t('findings.summary.businessContext', {
                version: prioritization.business_context_version,
              })}
        </span>
      </p>

      <FilterChips
        filters={filters}
        totalCount={prioritization.findings.length}
        filteredCount={filteredSet.size}
        onRemove={onRemoveChip}
        onClearAll={onClearAll}
        lastRunAt={formatDate(prioritization.created_at)}
      />

      {filteredGroups.map((group) => (
        <GroupPanel key={group.position} order={order} group={group} onOpen={onOpen} />
      ))}

      {hasActiveFilters(filters) && filteredGroups.length === 0 && (
        <Message>{t('findings.filter.noResults')}</Message>
      )}

      <Modal open={open !== undefined} onClose={onClose} width="xl" initialFocus={closeButton}>
        {open && (
          <FindingDetail order={order} finding={open} onClose={onClose} closeButton={closeButton} />
        )}
      </Modal>
    </>
  )
}
