import { useTranslation } from 'react-i18next'
import { useUnknownExposureQuery } from '../../api/exposure'
import { useInventory } from '../../api/inventory'
import { useCanEdit } from '../../auth/permissions'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { Message } from '../../components/ui/Message'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { AssetFilterBar } from './AssetFilterBar'
import { AssetInspector } from './AssetInspector'
import { AssetPager } from './AssetPager'
import { ExposureSheet, type ExposureSheetTarget } from './ExposureSheet'

const KEYS = {
  loading: 'config.inventory.loading',
  failed: 'config.inventory.loadFailed',
  network: 'config.inventory.networkError',
} as const

/*
 * Unknown Exposure is a to-do: the count covers the whole inventory, not the page on screen.
 * Nothing shows until the count is known, so it never claims everything is answered.
 */
function UnknownExposureBanner({ onAnswer }: { onAnswer: (sheet: ExposureSheetTarget) => void }) {
  const { t } = useTranslation()
  const canEdit = useCanEdit()
  const { data: unknown } = useUnknownExposureQuery()
  if (!unknown) return null

  if (unknown.length === 0) {
    return (
      <p className="flex items-center gap-2 font-body text-[0.8125rem] text-gray">
        <CheckIcon size={13} className="text-nav-active-bg" />
        {t('config.exposure.banner.none')}
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-high bg-high/10 px-4 py-2.5 font-body text-[0.8125rem] text-navy">
      <p className="min-w-0 flex-1 leading-[1.4]">
        <strong className="font-semibold">{t('config.exposure.banner.count', { count: unknown.length })}</strong>{' '}
        <span className="text-gray">{t('config.exposure.banner.dataGap')}</span>
      </p>
      {canEdit && (
        <Button size="sm" onClick={() => onAnswer({ mode: 'queue', assets: unknown })}>
          {t('config.exposure.banner.answer')}
        </Button>
      )}
    </div>
  )
}

export function TechStackTable() {
  const { t } = useTranslation()
  const { query, filtered, navigating, filters, filterBy, pager } = useInventory()
  const exposureSheet = useDialogTarget<ExposureSheetTarget>()
  // The Inspector carries the pager in its list; without it (an empty or failed page) the pager
  // stands on its own, so a later page always offers the way back.
  const inspecting = (query.data?.assets.length ?? 0) > 0

  return (
    <section>
      <div className="flex flex-col gap-4 border-b border-border-panel px-6 pt-5 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
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
        <UnknownExposureBanner onAnswer={exposureSheet.show} />
      </div>

      <QueryBoundary query={query} keys={KEYS}>
        {({ assets }) =>
          assets.length === 0 ? (
            <Message>
              {filtered ? t('config.inventory.noMatches') : t('config.inventory.empty')}
            </Message>
          ) : (
            <AssetInspector
              assets={assets}
              busy={navigating}
              pager={pager}
              onOpenExposure={(asset) => exposureSheet.show({ mode: 'single', asset })}
            />
          )
        }
      </QueryBoundary>

      {pager && !inspecting && (
        <div className="flex justify-end px-6 py-4">
          <AssetPager pager={pager} />
        </div>
      )}

      <ExposureSheet dialog={exposureSheet} />
    </section>
  )
}
