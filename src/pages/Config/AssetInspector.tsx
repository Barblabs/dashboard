import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { assetKey, unidentifiedCount, type Asset, type Criticality } from '../../api/assets'
import type { Pager } from '../../api/inventory'
import { AssetPager } from './AssetPager'
import { AssetRecord } from './AssetRecord'
import { revealInList } from './revealInList'

const CRITICALITY_DOT: Record<Criticality, string> = {
  high: 'bg-navy',
  medium: 'bg-nav-active-bg/60',
  low: 'bg-muted-bg',
}

const optionId = (asset: Asset) => `asset-${assetKey(asset)}`

/** Flags the data gaps that keep threats from being checked against the Asset. */
function GapDot({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const unidentified = unidentifiedCount(asset)
  const gaps = [
    asset.exposure.value === null && t('config.inventory.inspector.gaps.unknownExposure'),
    unidentified > 0 && t('config.inventory.inspector.gaps.unidentified', { count: unidentified }),
  ].filter(Boolean)
  if (gaps.length === 0) return null

  const label = gaps.join(' · ')
  return <span role="img" aria-label={label} title={label} className="size-1.5 shrink-0 rounded-full bg-high" />
}

function AssetOption({ asset, selected, onSelect }: { asset: Asset; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation()
  return (
    <li
      id={optionId(asset)}
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border-row px-5 py-2.5 ${selected ? 'bg-row-hover shadow-[inset_2px_0_0_var(--color-navy)]' : 'hover:bg-row-hover/60'} ${asset.active ? '' : 'opacity-55'}`}
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[0.875rem] font-medium text-navy">{asset.name}</span>
        <span className="truncate text-[0.75rem] text-gray">
          {t(`config.inventory.kind.${asset.kind}`)} ·{' '}
          {asset.area?.name ?? t('config.inventory.inspector.noArea')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <GapDot asset={asset} />
        <span className="inline-flex w-[4.5rem] items-center gap-1.5 text-[0.75rem] text-gray">
          <span
            className={`size-2 shrink-0 rounded-full ${asset.criticality ? CRITICALITY_DOT[asset.criticality] : 'border border-muted-bg'}`}
          />
          {t(`config.inventory.criticality.${asset.criticality ?? 'unknown'}`)}
        </span>
      </div>
    </li>
  )
}

const KEY_MOVES: Record<string, (index: number, last: number) => number> = {
  ArrowDown: (index, last) => Math.min(index + 1, last),
  ArrowUp: (index) => Math.max(index - 1, 0),
  Home: () => 0,
  End: (_, last) => last,
}

interface AssetInspectorProps {
  /** Never empty: the caller shows its empty and no-match messages instead. */
  assets: Asset[]
  busy: boolean
  pager: Pager | null
  onOpenExposure: (asset: Asset) => void
}

/** A page of Assets to scan on the left, the selected one's full record on the right. */
export function AssetInspector({ assets, busy, pager, onOpenExposure }: AssetInspectorProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Keyed rather than held by reference: a refetch replaces the objects, and a selection that
  // left the page (a filter, paging, a refetch) falls back to its first Asset.
  const selectedIndex = Math.max(
    assets.findIndex((asset) => assetKey(asset) === selectedKey),
    0,
  )
  const selected = assets[selectedIndex]
  const selectedId = optionId(selected)
  // The fallback is stored, so paging back to a page that holds the old selection doesn't revive it.
  if (assetKey(selected) !== selectedKey) setSelectedKey(assetKey(selected))

  // The list is `relative` so each option's offsetTop is measured from it.
  useEffect(() => {
    const list = listRef.current
    const option = document.getElementById(selectedId)
    if (list && option) list.scrollTop = revealInList(list, option)
  }, [selectedId])

  const onKeyDown = (event: KeyboardEvent) => {
    const move = KEY_MOVES[event.key]
    if (!move) return
    event.preventDefault()
    setSelectedKey(assetKey(assets[move(selectedIndex, assets.length - 1)]))
  }

  return (
    <div className="grid grid-cols-1 lg:h-[min(46rem,calc(100vh-14rem))] lg:min-h-[28rem] lg:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-b border-border-panel lg:border-r lg:border-b-0">
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={0}
          aria-label={t('config.inventory.title')}
          aria-activedescendant={selectedId}
          aria-busy={busy || undefined}
          onKeyDown={onKeyDown}
          className={`relative max-h-[22rem] min-h-0 flex-1 overflow-y-auto lg:max-h-none outline-none transition-opacity duration-150 focus-visible:shadow-[inset_0_0_0_2px_var(--color-navy)] ${busy ? 'opacity-60' : ''}`}
        >
          {assets.map((asset) => (
            <AssetOption
              key={assetKey(asset)}
              asset={asset}
              selected={asset === selected}
              onSelect={() => {
                setSelectedKey(assetKey(asset))
                listRef.current?.focus()
              }}
            />
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-panel px-5 py-3">
          <span className="font-body text-[0.75rem] text-gray">{t('config.inventory.inspector.moveHint')}</span>
          {pager && <AssetPager pager={pager} />}
        </div>
      </div>
      {/* Keyed so each record opens at its top, not at the previous one's scroll position. */}
      <div key={selectedId} className="min-h-0 lg:overflow-y-auto">
        <AssetRecord asset={selected} onOpenExposure={onOpenExposure} />
      </div>
    </div>
  )
}
