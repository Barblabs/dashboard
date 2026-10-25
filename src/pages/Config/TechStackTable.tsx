import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_ASSET_FILTERS, useAssetsQuery, type AssetFilters } from '../../api/assets'
import { errorCode } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import { AssetFilterBar } from './AssetFilterBar'
import { AssetsTable } from './AssetsTable'

const MESSAGE = 'px-6 py-12 text-center text-[0.875rem] text-gray'

interface Listing {
  filters: AssetFilters
  /** Cursors are forward-only: the stack of visited pages is what makes "Previous" possible. */
  cursors: (string | null)[]
}

const FIRST_PAGE: Listing['cursors'] = [null]

function hasFilters({ active, kind, criticality }: AssetFilters) {
  return (
    active !== DEFAULT_ASSET_FILTERS.active ||
    kind !== DEFAULT_ASSET_FILTERS.kind ||
    criticality !== DEFAULT_ASSET_FILTERS.criticality
  )
}

export function TechStackTable() {
  const { t } = useTranslation()
  const [listing, setListing] = useState<Listing>({
    filters: DEFAULT_ASSET_FILTERS,
    cursors: FIRST_PAGE,
  })
  const cursor = listing.cursors[listing.cursors.length - 1] ?? null
  const assetsQuery = useAssetsQuery(listing.filters, cursor)

  // A cursor the backend no longer accepts (stale or tampered) restarts the listing.
  // Reset while rendering: it clears the cursor, so it cannot repeat.
  if (cursor !== null && errorCode(assetsQuery.error) === 'invalid_request') {
    setListing({ ...listing, cursors: FIRST_PAGE })
  }

  // A cursor is only valid with the filters that produced it, so new filters start at page one.
  const changeFilters = (filters: AssetFilters) => setListing({ filters, cursors: FIRST_PAGE })
  const nextCursor = assetsQuery.data?.next_cursor ?? null
  const goNext = () => {
    if (nextCursor) setListing((current) => ({ ...current, cursors: [...current.cursors, nextCursor] }))
  }
  const goPrevious = () =>
    setListing((current) => ({ ...current, cursors: current.cursors.slice(0, -1) }))

  const page = assetsQuery.data ?? { assets: [], next_cursor: null, total: 0 }
  const pageNumber = listing.cursors.length
  // While the placeholder page shows, its next_cursor belongs to the previous request.
  const navigating = assetsQuery.isPlaceholderData

  return (
    <section className="overflow-hidden rounded-lg border border-border-panel bg-white">
      <div className="flex flex-col gap-4 border-b border-border-panel px-6 pt-5 pb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-title text-[1rem] text-navy">{t('config.inventory.title')}</h2>
          {assetsQuery.isSuccess && (
            <span className="font-body text-[0.8125rem] text-gray">
              {t('config.inventory.total', { count: page.total })}
            </span>
          )}
        </div>
        <AssetFilterBar filters={listing.filters} onChange={changeFilters} />
      </div>

      {assetsQuery.isPending ? (
        <div className={MESSAGE}>{t('config.inventory.loading')}</div>
      ) : assetsQuery.isError ? (
        <div role="alert" className={`${MESSAGE} flex flex-col items-center gap-3`}>
          {requestErrorText(assetsQuery.error, t, {
            fallback: 'config.inventory.loadFailed',
            network: 'config.inventory.networkError',
          })}
          <Button variant="secondary" size="sm" onClick={() => void assetsQuery.refetch()}>
            {t('config.inventory.retry')}
          </Button>
        </div>
      ) : page.assets.length === 0 ? (
        <div className={MESSAGE}>
          {hasFilters(listing.filters) ? t('config.inventory.noMatches') : t('config.inventory.empty')}
        </div>
      ) : (
        <AssetsTable assets={page.assets} busy={navigating} />
      )}

      {(pageNumber > 1 || nextCursor) && (
        <nav
          aria-label={t('config.inventory.pagination.label')}
          className="flex items-center justify-end gap-3 px-6 py-4"
        >
          <span className="font-body text-[0.8125rem] text-gray">
            {t('config.inventory.pagination.page', { page: pageNumber })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={pageNumber === 1 || navigating}
            onClick={goPrevious}
          >
            {t('config.inventory.pagination.previous')}
          </Button>
          <Button variant="secondary" size="sm" disabled={!nextCursor || navigating} onClick={goNext}>
            {t('config.inventory.pagination.next')}
          </Button>
        </nav>
      )}
    </section>
  )
}
