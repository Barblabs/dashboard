import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { unidentifiedCount, type Asset } from '../../api/assets'
import { Badge } from '../../components/ui/Badge'
import { CheckIcon } from '../../components/ui/icons'
import { EMPTY, useDateFormat } from '../../i18n/format'
import { exposureLabel } from './assetText'

const MONO = 'font-mono text-[0.8125rem]'
const LABEL = 'font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase'

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
function ExposureButton({ asset, onOpen }: { asset: Asset; onOpen: (asset: Asset) => void }) {
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

export function AssetRecord({ asset, onOpenExposure }: { asset: Asset; onOpenExposure: (asset: Asset) => void }) {
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
          <ExposureButton asset={asset} onOpen={onOpenExposure} />
        </Fact>
        <Fact label={t('config.inventory.record.lifecycleStage')}>
          {asset.retired ? (
            // A retired Asset has no Lifecycle Stage: it isn't Unknown, there is none.
            <span className="text-gray">{EMPTY}</span>
          ) : (
            <Badge variant={asset.lifecycle_stage ? 'outline' : 'muted'}>
              {t(`config.inventory.lifecycleStage.${asset.lifecycle_stage ?? 'unknown'}`)}
            </Badge>
          )}
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
