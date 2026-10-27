import { useTranslation } from 'react-i18next'
import { useInventory } from '../../api/inventory'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import { AssetFilterBar } from './AssetFilterBar'
import { AssetsTable } from './AssetsTable'

const MESSAGE = 'px-6 py-12 text-center text-[0.875rem] text-gray'

export function TechStackTable() {
  const { t } = useTranslation()
  const { status, filters, filterBy, pager } = useInventory()

  return (
    <section className="overflow-hidden rounded-lg border border-border-panel bg-white">
      <div className="flex flex-col gap-4 border-b border-border-panel px-6 pt-5 pb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-title text-[1rem] text-navy">{t('config.inventory.title')}</h2>
          {status.state === 'ready' && (
            <span className="font-body text-[0.8125rem] text-gray">
              {t('config.inventory.total', { count: status.total })}
            </span>
          )}
        </div>
        <AssetFilterBar filters={filters} onChange={filterBy} />
      </div>

      {status.state === 'loading' ? (
        <div className={MESSAGE}>{t('config.inventory.loading')}</div>
      ) : status.state === 'failed' ? (
        <div role="alert" className={`${MESSAGE} flex flex-col items-center gap-3`}>
          {requestErrorText(status.error, t, {
            fallback: 'config.inventory.loadFailed',
            network: 'config.inventory.networkError',
          })}
          <Button variant="secondary" size="sm" onClick={status.retry}>
            {t('config.inventory.retry')}
          </Button>
        </div>
      ) : status.assets.length === 0 ? (
        <div className={MESSAGE}>
          {status.filtered ? t('config.inventory.noMatches') : t('config.inventory.empty')}
        </div>
      ) : (
        <AssetsTable assets={status.assets} busy={status.navigating} />
      )}

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
