import type { CmdbProvider } from '../../api/types'
import './CmdbSelector.css'

const PROVIDERS: CmdbProvider[] = [
  {
    id: 'itop',
    name: 'iTop',
    description: 'CMDB de código abierto. Se conecta por su API REST con un usuario de solo lectura.',
    initial: 'I',
    available: true,
  },
  {
    id: 'servicenow',
    name: 'ServiceNow',
    description: 'Integración planeada para una siguiente versión.',
    initial: 'S',
    available: false,
  },
  {
    id: 'other',
    name: 'Otra CMDB',
    description: 'Conexión por API genérica o archivo de inventario.',
    initial: 'O',
    available: false,
  },
]

interface Props {
  onSelect: () => void
}

export function CmdbSelector({ onSelect }: Props) {
  return (
    <div className="cmdb-selector">
      <div className="cmdb-selector__header">
        <h3 className="cmdb-selector__title">Elige tu CMDB</h3>
        <p className="cmdb-selector__subtitle">
          Selecciona de dónde viene tu inventario de activos.
        </p>
      </div>

      <div className="cmdb-selector__list">
        {PROVIDERS.map((p) =>
          p.available ? (
            <div key={p.id} className="cmdb-option cmdb-option--available">
              <span className="cmdb-option__icon cmdb-option__icon--active">
                {p.initial}
              </span>
              <div className="cmdb-option__text">
                <span className="cmdb-option__name">{p.name}</span>
                <span className="cmdb-option__desc">{p.description}</span>
              </div>
              <button
                type="button"
                className="cmdb-option__btn"
                onClick={() => onSelect()}
              >
                Seleccionar
              </button>
            </div>
          ) : (
            <div key={p.id} className="cmdb-option cmdb-option--disabled">
              <span className="cmdb-option__icon cmdb-option__icon--muted">
                {p.initial}
              </span>
              <div className="cmdb-option__text">
                <span className="cmdb-option__name">{p.name}</span>
                <span className="cmdb-option__desc">{p.description}</span>
              </div>
              <span className="cmdb-option__soon">Próximamente</span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
