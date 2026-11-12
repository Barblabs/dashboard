import { useTranslation } from 'react-i18next'
import { useInventory } from '../../api/inventory'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Button } from '../../components/ui/Button'
import { AssetFilterBar } from './AssetFilterBar'
import { AssetsTable } from './AssetsTable'
import { Message } from '../../components/ui/Message'

const KEYS = {
  loading: 'config.inventory.loading',
  failed: 'config.inventory.loadFailed',
  network: 'config.inventory.networkError',
  retry: 'config.inventory.retry',
} as const

export function TechStackTable() {
  const { t } = useTranslation()
  const { query, filtered, navigating, filters, filterBy, pager } = useInventory()

  return (
    <section>
      <div className="flex flex-col gap-4 border-b border-border-panel px-6 pt-5 pb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-title text-[1rem] text-navy">{t('config.inventory.title')}</h2>
          {query.data && (
            <span className="font-body text-[0.8125rem] text-gray">
              {t('config.inventory.total', { count: query.data.total })}
            </span>
          )}
        </div>
        <AssetFilterBar filters={filters} onChange={filterBy} />
      </div>

      <QueryBoundary query={query} keys={KEYS}>
        {({ assets }) =>
          assets.length === 0 ? (
            <Message>
              {filtered ? t('config.inventory.noMatches') : t('config.inventory.empty')}
            </Message>
          ) : (
            <AssetsTable assets={assets} busy={navigating} />
          )
        }
      </QueryBoundary>

      {pager && (
        <nav
          aria-label={t('config.inventory.pagination.label')}
          className="flex items-center justify-end gap-3 px-6 py-4"
        >
          <span className="font-body text-[0.8125rem] text-gray">
            {t('config.inventory.pagination.page', { page: pager.page })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!pager.previous}
            onClick={pager.previous ?? undefined}
          >
            {t('config.inventory.pagination.previous')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!pager.next}
            onClick={pager.next ?? undefined}
          >
            {t('config.inventory.pagination.next')}
          </Button>
        </nav>
      )}
    </section>
  )
}
