import { useTranslation } from 'react-i18next'
import { useInventory } from '../../api/inventory'
import { useNeedsTriageQuery } from '../../api/triage'
import { useCanEdit } from '../../auth/permissions'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { Message } from '../../components/ui/Message'
import { useDialogTarget } from '../../components/ui/useDialogTarget'
import { AssetFilterBar } from './AssetFilterBar'
import { AssetInspector } from './AssetInspector'
import { AssetPager } from './AssetPager'
import { AssetTriageSheet, type AssetTriageTarget } from './AssetTriageSheet'

const KEYS = {
  loading: 'config.inventory.loading',
  failed: 'config.inventory.loadFailed',
  network: 'config.inventory.networkError',
} as const

/*
 * Triage is a to-do: the count covers the whole inventory, not the page on screen.
 * Nothing shows until the count is known, so it never claims everything is triaged.
 */
function TriageBanner({ onTriage }: { onTriage: (sheet: AssetTriageTarget) => void }) {
  const { t } = useTranslation()
  const canEdit = useCanEdit()
  const { data: pending } = useNeedsTriageQuery()
  if (!pending) return null

  if (pending.length === 0) {
    return (
      <p className="flex items-center gap-2 font-body text-[0.8125rem] text-gray">
        <CheckIcon size={13} className="text-nav-active-bg" />
        {t('config.triage.banner.none')}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3 rounded-md border border-high bg-high/10 px-4 py-2.5 font-body text-[0.8125rem] text-navy md:flex-row md:flex-wrap md:items-center">
      <p className="min-w-0 leading-[1.4] md:flex-1">
        <strong className="font-semibold">{t('config.triage.banner.count', { count: pending.length })}</strong>{' '}
        <span className="text-gray">{t('config.triage.banner.detail')}</span>
      </p>
      {canEdit && (
        <Button size="sm" className="self-start md:self-auto" onClick={() => onTriage({ mode: 'queue', assets: pending })}>
          {t('config.triage.banner.action')}
        </Button>
      )}
    </div>
  )
}

export function TechStackTable() {
  const { t } = useTranslation()
  const { query, filtered, navigating, filters, filterBy, pager } = useInventory()
  const triageSheet = useDialogTarget<AssetTriageTarget>()
  // The Inspector carries the pager in its list; without it (an empty or failed page) the pager
  // stands on its own, so a later page always offers the way back.
  const inspecting = (query.data?.assets.length ?? 0) > 0

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
        <TriageBanner onTriage={triageSheet.show} />
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
              onOpenTriage={(asset) => triageSheet.show({ mode: 'single', asset })}
            />
          )
        }
      </QueryBoundary>

      {pager && !inspecting && (
        <div className="flex justify-end px-6 py-4">
          <AssetPager pager={pager} />
        </div>
      )}

      <AssetTriageSheet dialog={triageSheet} />
    </section>
  )
}
