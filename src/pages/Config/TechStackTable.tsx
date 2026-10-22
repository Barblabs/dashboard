import type { Asset, Criticality } from '../../api/types'
import './TechStackTable.css'

interface Props {
  assets: Asset[]
}

const CRITICALITY_LABEL: Record<Criticality, string> = {
  High:    'Alta',
  Medium:  'Media',
  Low:     'Baja',
  Unknown: 'Desconocida',
}

function osLabel(asset: Asset): string {
  const os = asset.software.find((s) => s.role === 'Operating System')
  if (!os) return '—'
  return os.version ? `${os.name} ${os.version}` : os.name
}

export function TechStackTable({ assets }: Props) {
  if (assets.length === 0) {
    return (
      <div className="table-empty">
        No hay activos registrados en el inventario.
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="tech-table">
        <thead>
          <tr>
            <th>Componente</th>
            <th>Tipo</th>
            <th>Sistema operativo</th>
            <th>Criticidad</th>
            <th>Dueño</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.record_id} className={asset.active ? '' : 'row--inactive'}>
              <td>
                <span className="asset-name">{asset.name}</span>
                <span className="asset-id">{asset.record_id}</span>
              </td>
              <td>{asset.kind}</td>
              <td className="cell-mono">{osLabel(asset)}</td>
              <td>
                <span className={`badge${asset.criticality === 'Unknown' ? ' badge--unknown' : ''}`}>
                  {CRITICALITY_LABEL[asset.criticality]}
                </span>
              </td>
              <td className="cell-mono">{asset.owner ?? '—'}</td>
              <td>
                <span className={`status ${asset.active ? 'status--active' : 'status--inactive'}`}>
                  <span className="status__dot" />
                  {asset.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
