import { useEffect, useState } from 'react'
import { fetchAssets } from '../../api/client'
import { mockAssetsResponse } from '../../mocks/assets'
import type { Asset } from '../../api/types'
import { TechStackTable } from './TechStackTable'
import './Config.css'

type Status = 'loading' | 'success' | 'error'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export function ConfigPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (useMock) {
      setAssets(mockAssetsResponse.assets)
      setStatus('success')
      return
    }

    fetchAssets()
      .then((data) => {
        setAssets(data.assets)
        setStatus('success')
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
        setStatus('error')
      })
  }, [])

  return (
    <main className="config-page">
      <header className="config-page__header">
        <div className="config-page__title-row">
          <h1 className="config-page__title">Configuración</h1>
          {useMock && (
            <span className="config-page__mock-badge">Datos de ejemplo</span>
          )}
        </div>
        {status === 'success' && (
          <p className="config-page__subtitle">
            {assets.length} activos · fuente: iTop
          </p>
        )}
      </header>

      <section className="config-page__section">
        <h2 className="config-page__section-title">Stack tecnológico</h2>

        {status === 'loading' && (
          <div className="config-page__state">Cargando inventario…</div>
        )}

        {status === 'error' && (
          <div className="config-page__state config-page__state--error">
            No se pudo cargar el inventario: {errorMsg}
          </div>
        )}

        {status === 'success' && <TechStackTable assets={assets} />}
      </section>
    </main>
  )
}
