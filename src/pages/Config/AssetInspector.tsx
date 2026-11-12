import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { assetKey, type Asset, type Criticality } from '../../api/assets'
import type { Pager } from '../../api/inventory'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { EMPTY, useDateFormat } from '../../i18n/format'
import { exposureLabel } from './assetText'

const MONO = 'font-mono text-[0.8125rem]'
const LABEL = 'font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase'

const CRITICALITY_DOT: Record<Criticality, string> = {
  high: 'bg-navy',
  medium: 'bg-nav-active-bg/60',
  low: 'bg-muted-bg',
}

const optionId = (asset: Asset) => `asset-${assetKey(asset)}`

function unidentifiedCount(asset: Asset) {
  return asset.software.filter((component) => component.product === null).length
}

function AssetStatus({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${asset.active ? 'text-navy' : 'text-gray'}`}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {asset.active
        ? t('config.inventory.status.active')
        : asset.inactive_since
          ? t('config.inventory.status.inactiveSince', { date: formatDate(asset.inactive_since) })
          : t('config.inventory.status.inactive')}
    </span>
  )
}

/** The effective Exposure and where it comes from; opens the Exposure sheet for the Asset. */
function ExposureCell({ asset, onOpen }: { asset: Asset; onOpen: (asset: Asset) => void }) {
  const { t } = useTranslation()
  const { value, source } = asset.exposure
  const valueText = exposureLabel(t, value)
  return (
    <button
      type="button"
      aria-label={t(`config.exposure.cellLabel.${source}`, { name: asset.name, value: valueText })}
      onClick={() => onOpen(asset)}
      className={`focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-2.5 py-[3px] font-body text-[0.75rem] font-medium whitespace-nowrap text-navy transition-[border-color] duration-150 ease-out hover:border-navy ${value ? 'border-border-panel bg-white' : 'border-high bg-high/10'}`}
    >
      {valueText}
      <span aria-hidden="true" className="text-gray">
        ·
      </span>
      <span className={source === 'declared' ? 'font-semibold text-nav-active-bg' : 'text-gray'}>
        {t(`config.exposure.source.${source}`)}
      </span>
    </button>
  )
}

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

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={LABEL}>{label}</dt>
      <dd className="text-[0.875rem] text-navy">{children}</dd>
    </div>
  )
}

function SoftwareComponents({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const unidentified = unidentifiedCount(asset)

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className={LABEL}>{t('config.inventory.record.software')}</h4>
        {unidentified > 0 && (
          <span className="text-[0.75rem] text-gray">
            {t('config.inventory.inspector.unidentifiedCount', {
              count: unidentified,
              total: asset.software.length,
            })}
          </span>
        )}
      </div>
      {asset.software.length === 0 ? (
        <p className="text-[0.875rem] text-gray">{t('config.inventory.record.noSoftware')}</p>
      ) : (
        <ul className="flex flex-col rounded-md border border-border-panel">
          {asset.software.map((component, index) => (
            // Components have no identity of their own; the list order is the backend's.
            <li key={index} className="flex items-center gap-3 border-b border-border-row px-3.5 py-2.5 last:border-0">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={`${MONO} truncate text-navy`}>
                  {component.name}
                  {component.version && <span className="text-gray"> {component.version}</span>}
                </span>
                <span className="text-[0.75rem] text-gray">{t(`config.inventory.role.${component.role}`)}</span>
              </div>
              {component.product ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.75rem] text-gray">
                  <CheckIcon size={11} className="text-nav-active-bg" />
                  {component.product.vendor} {component.product.name}
                </span>
              ) : (
                <Badge variant="warning" title={t('config.inventory.record.unidentifiedHelp')}>
                  {t('config.inventory.record.unidentified')}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AssetRecord({ asset, onOpenExposure }: { asset: Asset; onOpenExposure: (asset: Asset) => void }) {
  const { t } = useTranslation()

  return (
    <article aria-label={asset.name} className="flex flex-col gap-6 px-7 py-6">
      <header className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-gray">
          {t(`config.inventory.kind.${asset.kind}`)}
          <span aria-hidden="true">·</span>
          <span className="font-mono">{asset.record_id}</span>
          <span aria-hidden="true">·</span>
          <AssetStatus asset={asset} />
        </span>
        <h3 className="font-title text-[1.25rem] leading-tight text-navy">{asset.name}</h3>
        {asset.description && <p className="text-[0.875rem] text-gray">{asset.description}</p>}
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Fact label={t('config.inventory.record.criticality')}>
          <Badge variant={asset.criticality ? 'outline' : 'muted'}>
            {t(`config.inventory.criticality.${asset.criticality ?? 'unknown'}`)}
          </Badge>
        </Fact>
        <Fact label={t('config.inventory.record.exposure')}>
          <ExposureCell asset={asset} onOpen={onOpenExposure} />
        </Fact>
        <Fact label={t('config.inventory.record.owner')}>
          {asset.owner ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className={MONO}>{asset.owner.email}</span>
              {asset.owner.source === 'declared' && (
                <Badge variant="muted">{t('config.inventory.owner.declared')}</Badge>
              )}
            </span>
          ) : (
            <span className="text-gray">{EMPTY}</span>
          )}
        </Fact>
        <Fact label={t('config.inventory.record.area')}>{asset.area?.name ?? EMPTY}</Fact>
        <Fact label={t('config.inventory.record.hardware')}>
          {asset.hardware ? (
            `${asset.hardware.vendor} ${asset.hardware.model}`
          ) : (
            <span className="text-gray">{t('config.inventory.record.noHardware')}</span>
          )}
        </Fact>
        <Fact label={t('config.inventory.record.retired')}>
          {asset.retired ? t('config.inventory.record.yes') : t('config.inventory.record.no')}
        </Fact>
      </dl>

      <SoftwareComponents asset={asset} />
    </article>
  )
}

function AssetPager({ pager }: { pager: Pager }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('config.inventory.pagination.label')} className="flex items-center gap-3">
      <span className="font-body text-[0.8125rem] text-gray">
        {t('config.inventory.pagination.page', { page: pager.page })}
      </span>
      <Button variant="secondary" size="sm" disabled={!pager.previous} onClick={pager.previous ?? undefined}>
        {t('config.inventory.pagination.previous')}
      </Button>
      <Button variant="secondary" size="sm" disabled={!pager.next} onClick={pager.next ?? undefined}>
        {t('config.inventory.pagination.next')}
      </Button>
    </nav>
  )
}

const KEY_MOVES: Record<string, (index: number, last: number) => number> = {
  ArrowDown: (index, last) => Math.min(index + 1, last),
  ArrowUp: (index) => Math.max(index - 1, 0),
  Home: () => 0,
  End: (_, last) => last,
}

interface AssetInspectorProps {
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
  const selectedId = selected && optionId(selected)
  // The fallback is stored, so paging back to a page that holds the old selection doesn't revive it.
  if (selected && assetKey(selected) !== selectedKey) setSelectedKey(assetKey(selected))

  useEffect(() => {
    if (selectedId) document.getElementById(selectedId)?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const onKeyDown = (event: KeyboardEvent) => {
    const move = KEY_MOVES[event.key]
    if (!move) return
    event.preventDefault()
    const target = assets[move(selectedIndex, assets.length - 1)]
    if (target) setSelectedKey(assetKey(target))
  }

  return (
    <div className="grid grid-cols-1 lg:h-[min(46rem,calc(100vh-14rem))] lg:min-h-[28rem] lg:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)]">
      <div className="flex max-h-[22rem] min-h-0 flex-col border-b border-border-panel lg:max-h-none lg:border-r lg:border-b-0">
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={0}
          aria-label={t('config.inventory.title')}
          aria-activedescendant={selectedId}
          aria-busy={busy || undefined}
          onKeyDown={onKeyDown}
          className={`min-h-0 flex-1 overflow-y-auto outline-none transition-opacity duration-150 focus-visible:shadow-[inset_0_0_0_2px_var(--color-navy)] ${busy ? 'opacity-60' : ''}`}
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
      <div className="min-h-0 lg:overflow-y-auto">
        {selected && <AssetRecord asset={selected} onOpenExposure={onOpenExposure} />}
      </div>
    </div>
  )
}
