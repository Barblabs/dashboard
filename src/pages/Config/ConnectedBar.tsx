import type { CmdbConnection } from '../../api/types'
import './ConnectedBar.css'

interface Props {
  connection: CmdbConnection
  isSyncing: boolean
  showConfirm: boolean
  onDisconnect: () => void
  onEdit: () => void
  onSync: () => void
  onConfirmDisconnect: () => void
  onCancelDisconnect: () => void
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'nunca'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'hace menos de un minuto'
  if (min === 1) return 'hace 1 min'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return h === 1 ? 'hace 1 h' : `hace ${h} h`
}

export function ConnectedBar({
  connection,
  isSyncing,
  showConfirm,
  onDisconnect,
  onEdit,
  onSync,
  onConfirmDisconnect,
  onCancelDisconnect,
}: Props) {
  return (
    <div className="connected-bar-wrapper">
      <div className="connected-bar">
        <div className="connected-bar__info">
          <span className="connected-bar__badge">
            <span className="connected-bar__dot" />
            iTop conectado
          </span>
          <span className="connected-bar__detail">{connection.url}</span>
          <span className="connected-bar__sep">·</span>
          <span className="connected-bar__detail">{connection.user}</span>
          <span className="connected-bar__sep">·</span>
          <span className="connected-bar__detail connected-bar__detail--dim">
            Última sincronización: {relativeTime(connection.lastSync)}
          </span>
        </div>

        <div className="connected-bar__actions">
          <button
            type="button"
            className="bar-btn bar-btn--ghost"
            onClick={onDisconnect}
            disabled={isSyncing}
          >
            Desconectar
          </button>
          <button
            type="button"
            className="bar-btn bar-btn--secondary"
            onClick={onEdit}
            disabled={isSyncing}
          >
            Editar conexión
          </button>
          <button
            type="button"
            className="bar-btn bar-btn--primary"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="connected-bar__confirm">
          <p className="connected-bar__confirm-text">
            Esta acción desconectará el CMDB y eliminará la configuración guardada. ¿Continuar?
          </p>
          <div className="connected-bar__confirm-actions">
            <button
              type="button"
              className="bar-btn bar-btn--danger"
              onClick={onConfirmDisconnect}
            >
              Sí, desconectar
            </button>
            <button
              type="button"
              className="bar-btn bar-btn--secondary"
              onClick={onCancelDisconnect}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
