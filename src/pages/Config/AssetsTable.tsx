import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { assetKey, type Asset } from '../../api/assets'
import { Badge } from '../../components/ui/Badge'

const NONE = '-'

const HEADER_CELL =
  'px-4 py-3 text-left font-body text-[0.75rem] font-semibold tracking-[0.06em] whitespace-nowrap text-gray uppercase'
const CELL = 'border-b border-border-row px-4 py-3.5 align-middle text-navy'
const MONO = 'font-mono text-[0.8125rem]'
const DETAIL_LABEL = 'font-body text-[0.75rem] font-semibold tracking-[0.06em] text-gray uppercase'
const COLUMN_COUNT = 7

function versioned(name: string, version: string) {
  return version ? `${name} ${version}` : name
}

function osLabel(asset: Asset): string {
  const os = asset.software.find((s) => s.role === 'operating_system')
  return os ? versioned(os.name, os.version) : NONE
}

function useDateFormat() {
  const { i18n } = useTranslation()
  const format = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    dateStyle: 'medium',
  })
  return (iso: string) => format.format(new Date(iso))
}

function AssetStatus({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[0.8125rem] font-medium ${asset.active ? 'text-navy' : 'text-gray'}`}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {asset.active
        ? t('config.inventory.status.active')
        : asset.inactive_since
          ? t('config.inventory.status.inactiveSince', { date: formatDate(asset.inactive_since) })
          : t('config.inventory.status.inactive')}
    </span>
  )
}

function AssetDetails({ asset }: { asset: Asset }) {
  const { t } = useTranslation()

  return (
    <div className="flex animate-fade-in flex-col gap-4 bg-panel px-6 py-4">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <div className="flex flex-col gap-1">
          <dt className={DETAIL_LABEL}>{t('config.inventory.details.description')}</dt>
          <dd>{asset.description || NONE}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className={DETAIL_LABEL}>{t('config.inventory.details.hardware')}</dt>
          <dd>
            {asset.hardware
              ? `${asset.hardware.vendor} ${asset.hardware.model}`
              : t('config.inventory.details.noHardware')}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className={DETAIL_LABEL}>{t('config.inventory.details.exposure')}</dt>
          <dd>
            {t(`config.inventory.exposure.${asset.exposure ?? 'undeclared'}`)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className={DETAIL_LABEL}>{t('config.inventory.details.retired')}</dt>
          <dd>{asset.retired ? t('config.inventory.details.yes') : t('config.inventory.details.no')}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <h3 className={DETAIL_LABEL}>{t('config.inventory.details.software')}</h3>
        {asset.software.length === 0 ? (
          <p className="text-gray">{t('config.inventory.details.noSoftware')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {asset.software.map((component, index) => (
              // Components have no identity of their own; the list order is the backend's.
              <li key={index} className="flex flex-wrap items-center gap-2">
                <span className={MONO}>{versioned(component.name, component.version)}</span>
                <span className="text-[0.75rem] text-gray">
                  {t(`config.inventory.role.${component.role}`)}
                </span>
                {component.product ? (
                  <span className="text-[0.75rem] text-gray">
                    {component.product.vendor} {component.product.name}
                  </span>
                ) : (
                  <Badge variant="muted" title={t('config.inventory.details.unidentifiedHelp')}>
                    {t('config.inventory.details.unidentified')}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function AssetsTable({ assets, busy }: { assets: Asset[]; busy: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })

  return (
    <div className="animate-fade-in overflow-x-auto">
      <table
        aria-busy={busy || undefined}
        className={`w-full border-collapse text-[0.875rem] transition-opacity duration-150 ${busy ? 'opacity-60' : ''}`}
      >
        <thead>
          <tr className="border-b-2 border-border-row">
            <th className={HEADER_CELL}>{t('config.inventory.columns.asset')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.type')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.os')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.criticality')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.owner')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.status')}</th>
            <th className={HEADER_CELL}>
              <span className="sr-only">{t('config.inventory.columns.details')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const key = assetKey(asset)
            const isExpanded = expanded.has(key)
            const detailsId = `asset-details-${key}`
            return (
              <Fragment key={key}>
                <tr
                  // The whole row is the mouse target; the button stays the keyboard and screen reader path.
                  onClick={() => {
                    // Selecting text to copy it (a record id, an email) is not a request to expand.
                    if (window.getSelection()?.isCollapsed === false) return
                    toggle(key)
                  }}
                  className={`cursor-pointer hover:bg-row-hover ${asset.active ? '' : '*:opacity-50'}`}
                >
                  <td className={CELL}>
                    <span className="block font-medium">{asset.name}</span>
                    <span className="mt-0.5 block font-mono text-[0.6875rem] text-gray">
                      {asset.record_id}
                    </span>
                  </td>
                  <td className={CELL}>{t(`config.inventory.kind.${asset.kind}`)}</td>
                  <td className={`${CELL} ${MONO}`}>{osLabel(asset)}</td>
                  <td className={CELL}>
                    <Badge variant={asset.criticality ? 'outline' : 'muted'}>
                      {t(`config.inventory.criticality.${asset.criticality ?? 'unknown'}`)}
                    </Badge>
                  </td>
                  <td className={`${CELL} ${MONO}`}>
                    {asset.owner ? (
                      <span className="inline-flex items-center gap-2">
                        {asset.owner.email}
                        {asset.owner.source === 'declared' && (
                          <Badge variant="muted">{t('config.inventory.owner.declared')}</Badge>
                        )}
                      </span>
                    ) : (
                      NONE
                    )}
                  </td>
                  <td className={CELL}>
                    <AssetStatus asset={asset} />
                  </td>
                  <td className={`${CELL} text-right`}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={isExpanded ? detailsId : undefined}
                      aria-label={t(
                        isExpanded ? 'config.inventory.details.hide' : 'config.inventory.details.show',
                        { name: asset.name },
                      )}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggle(key)
                      }}
                      className="focus-ring cursor-pointer rounded-md px-2 py-1 text-gray transition-[color] duration-150 ease-[ease] hover:text-navy"
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block transition-transform duration-150 ease-[ease] ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        ›
                      </span>
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr id={detailsId}>
                    <td colSpan={COLUMN_COUNT} className="border-b border-border-row p-0">
                      <AssetDetails asset={asset} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
