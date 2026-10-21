import { useState } from 'react'
import type { CmdbTestResult } from '../../api/types'
import './ItopForm.css'

interface Props {
  initialUrl?: string
  initialUser?: string
  isTesting: boolean
  isConnecting: boolean
  testResult: CmdbTestResult | null
  onBack: () => void
  onTest: (url: string, user: string, password: string) => void
  onConnect: (url: string, user: string, password: string) => void
}

function validateUrl(v: string): string {
  if (!v.trim()) return 'La dirección es obligatoria.'
  if (!/^https?:\/\/.+/.test(v.trim())) return 'Debe comenzar con http:// o https://'
  return ''
}

function validateUser(v: string): string {
  if (!v.trim()) return 'El usuario es obligatorio.'
  return ''
}

export function ItopForm({
  initialUrl = '',
  initialUser = '',
  isTesting,
  isConnecting,
  testResult,
  onBack,
  onTest,
  onConnect,
}: Props) {
  const [url, setUrl]           = useState(initialUrl)
  const [user, setUser]         = useState(initialUser)
  const [password, setPassword] = useState('')
  const [urlError, setUrlError] = useState('')
  const [userError, setUserError] = useState('')

  const busy = isTesting || isConnecting

  function validate(): boolean {
    const ue = validateUrl(url)
    const se = validateUser(user)
    setUrlError(ue)
    setUserError(se)
    return !ue && !se && password.trim() !== ''
  }

  function handleTest() {
    if (!validate()) return
    onTest(url.trim(), user.trim(), password)
  }

  function handleConnect() {
    if (!validate()) return
    onConnect(url.trim(), user.trim(), password)
  }

  return (
    <div className="itop-form">
      <div className="itop-form__header">
        <h3 className="itop-form__title">Conectar iTop</h3>
        <button type="button" className="itop-form__back" onClick={onBack}>
          ← Cambiar CMDB
        </button>
      </div>

      <div className="itop-form__fields">
        {/* URL */}
        <div className="field">
          <label className="field__label" htmlFor="itop-url">
            Dirección de iTop (IP o URL)
          </label>
          <input
            id="itop-url"
            type="url"
            className={`field__input${urlError ? ' field__input--error' : ''}`}
            placeholder="http://10.0.0.5:8000"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setUrlError('') }}
            onBlur={() => setUrlError(validateUrl(url))}
            disabled={busy}
            autoComplete="off"
          />
          {urlError
            ? <span className="field__error">{urlError}</span>
            : <span className="field__help">Incluye el puerto si no es el 80 o el 443.</span>
          }
        </div>

        {/* User */}
        <div className="field">
          <label className="field__label" htmlFor="itop-user">
            Usuario
          </label>
          <input
            id="itop-user"
            type="text"
            className={`field__input${userError ? ' field__input--error' : ''}`}
            placeholder="barb-reader"
            value={user}
            onChange={(e) => { setUser(e.target.value); setUserError('') }}
            onBlur={() => setUserError(validateUser(user))}
            disabled={busy}
            autoComplete="username"
          />
          {userError
            ? <span className="field__error">{userError}</span>
            : <span className="field__help">
                Usuario con perfil REST Services User y permisos de solo lectura.
              </span>
          }
        </div>

        {/* Password */}
        <div className="field">
          <label className="field__label" htmlFor="itop-password">
            Contraseña
          </label>
          <input
            id="itop-password"
            type="password"
            className="field__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            autoComplete="new-password"
          />
          <span className="field__help">
            Se envía al backend. No se guarda en el navegador.
          </span>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`itop-form__result itop-form__result--${testResult.ok ? 'ok' : 'err'}`}>
          {testResult.ok
            ? '✓ Conexión exitosa. Puedes continuar con la sincronización.'
            : `✗ ${testResult.error ?? 'No se pudo conectar con iTop.'}`
          }
        </div>
      )}

      {/* Buttons */}
      <div className="itop-form__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleTest}
          disabled={busy || !password}
        >
          {isTesting ? 'Probando…' : 'Probar conexión'}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleConnect}
          disabled={busy || !password}
        >
          {isConnecting ? 'Conectando…' : 'Conectar y sincronizar'}
        </button>
      </div>
    </div>
  )
}
