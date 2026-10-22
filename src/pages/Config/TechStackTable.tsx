import { useTranslation } from 'react-i18next'
import { useAssetsQuery } from '../../api/queries'
import type { Asset } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { isMockMode } from '../../env'

function osLabel(asset: Asset): string {
  const os = asset.software.find((s) => s.role === 'Operating System')
  if (!os) return '—'
  return os.version ? `${os.name} ${os.version}` : os.name
}

const MESSAGE = 'px-6 py-12 text-center text-[14px] text-gray'
const HEADER_CELL =
  'px-4 py-3 text-left font-body text-[12px] font-semibold tracking-[0.06em] whitespace-nowrap text-gray uppercase'
const CELL = 'border-b border-[#e2e8ef] px-4 py-3.5 align-middle text-navy'
const MONO = 'font-mono text-[13px]'

function AssetsTable({ assets }: { assets: Asset[] }) {
  const { t } = useTranslation()

  if (assets.length === 0) {
    return <div className={MESSAGE}>{t('config.inventory.empty')}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr className="border-b-2 border-[#e2e8ef]">
            <th className={HEADER_CELL}>{t('config.inventory.columns.component')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.type')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.os')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.criticality')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.owner')}</th>
            <th className={HEADER_CELL}>{t('config.inventory.columns.status')}</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr
              key={asset.record_id}
              className={`hover:bg-[#edf1f7] ${asset.active ? '' : '*:opacity-50'}`}
            >
              <td className={CELL}>
                <span className="block font-medium">{asset.name}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-gray">
                  {asset.record_id}
                </span>
              </td>
              <td className={CELL}>{t(`config.inventory.kind.${asset.kind}`)}</td>
              <td className={`${CELL} ${MONO}`}>{osLabel(asset)}</td>
              <td className={CELL}>
                <Badge variant={asset.criticality === 'Unknown' ? 'muted' : 'outline'}>
                  {t(`config.inventory.criticality.${asset.criticality}`)}
                </Badge>
              </td>
              <td className={`${CELL} ${MONO}`}>{asset.owner ?? '—'}</td>
              <td className={CELL}>
                <span
                  className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${asset.active ? 'text-navy' : 'text-gray'}`}
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-current" />
                  {asset.active
                    ? t('config.inventory.status.active')
                    : t('config.inventory.status.inactive')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TechStackTable() {
  const { t } = useTranslation()
  const assetsQuery = useAssetsQuery()
  // Un inventario que no se pudo leer se muestra vacío, como antes de la migración.
  const assets = assetsQuery.data ?? []

  return (
    <section className="overflow-hidden rounded-lg border border-border-panel bg-white">
      <div className="flex items-baseline gap-3 border-b border-border-panel px-6 pt-5 pb-4">
        <h2 className="font-title text-[16px] text-navy">{t('config.inventory.title')}</h2>
        {isMockMode && !assetsQuery.isPending && (
          <span className="font-body text-[13px] text-gray">
            {t('config.inventory.count', { count: assets.length })}
          </span>
        )}
      </div>

      {assetsQuery.isPending
        ? <div className={MESSAGE}>{t('config.inventory.loading')}</div>
        : <AssetsTable assets={assets} />
      }
    </section>
  )
}
