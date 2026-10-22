import { useEffect, useState } from 'react'
import {
  getConnection,
  testConnection,
  connect,
  disconnect,
  syncNow,
} from '../../api/cmdb'
import { fetchAssets } from '../../api/assets'
import type { Asset, CmdbConnection, CmdbTestResult } from '../../api/types'
import { isMockMode } from '../../env'
import { ConfigStepPanel } from './ConfigStepPanel'
import { CmdbSelector } from './CmdbSelector'
import { ItopForm } from './ItopForm'
import { ConnectedBar } from './ConnectedBar'
import { TechStackTable } from './TechStackTable'
import './Config.css'

type Step = 'select' | 'form' | 'connected'

export function ConfigPage() {
  const [step, setStep]                   = useState<Step>('select')
  const [connection, setConnection]       = useState<CmdbConnection | null>(null)
  const [initLoading, setInitLoading]     = useState(true)

  /* form state (only lives here while user types; password cleared after connect) */
  const [editUrl, setEditUrl]   = useState('')
  const [editUser, setEditUser] = useState('')

  /* async operations */
  const [isTesting, setIsTesting]       = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing]       = useState(false)
  const [testResult, setTestResult]     = useState<CmdbTestResult | null>(null)

  /* table */
  const [assets, setAssets]     = useState<Asset[]>([])
  const [assetsLoaded, setAssetsLoaded] = useState(false)

  /* disconnect confirm */
  const [showConfirm, setShowConfirm] = useState(false)

  /* ── on mount: check existing connection ── */
  useEffect(() => {
    getConnection()
      .then((conn) => {
        if (conn) {
          setConnection(conn)
          setStep('connected')
        }
      })
      .catch(() => { /* no connection is fine */ })
      .finally(() => setInitLoading(false))
  }, [])

  /* ── load assets when entering connected state ── */
  useEffect(() => {
    if (step !== 'connected') return
    setAssetsLoaded(false)
    fetchAssets()
      .then((data) => { setAssets(data.assets); setAssetsLoaded(true) })
      .catch(() => setAssetsLoaded(true))
  }, [step])

  /* ── handlers ── */

  function handleSelectProvider() {
    setEditUrl('')
    setEditUser('')
    setTestResult(null)
    setStep('form')
  }

  async function handleTest(url: string, user: string, password: string) {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection({ url, user, password })
      setTestResult(result)
    } catch {
      setTestResult({ ok: false, error: 'Error de red al probar la conexión.' })
    } finally {
      setIsTesting(false)
    }
  }

  async function handleConnect(url: string, user: string, password: string) {
    setIsConnecting(true)
    try {
      await connect({ url, user, password })
      /* password never leaves component state, never reaches storage */
      const conn = await getConnection()
      setConnection(conn)
      setStep('connected')
      setTestResult(null)
    } catch {
      setTestResult({ ok: false, error: 'No se pudo guardar la conexión.' })
    } finally {
      setIsConnecting(false)
    }
  }

  function handleEdit() {
    setEditUrl(connection?.url ?? '')
    setEditUser(connection?.user ?? '')
    setTestResult(null)
    setStep('form')
    setShowConfirm(false)
  }

  function handleDisconnectClick() {
    setShowConfirm(true)
  }

  async function handleConfirmDisconnect() {
    await disconnect()
    setConnection(null)
    setStep('select')
    setShowConfirm(false)
    setAssets([])
    setAssetsLoaded(false)
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      await syncNow()
      const conn = await getConnection()
      setConnection(conn)
    } finally {
      setIsSyncing(false)
    }
  }

  /* ── render ── */

  if (initLoading) {
    return (
      <main className="config-page">
        <div className="config-page__loading">Cargando configuración…</div>
      </main>
    )
  }

  const stepNumber: 1 | 2 | 3 =
    step === 'select' ? 1 : step === 'form' ? 2 : 3

  return (
    <main className="config-page">
      <header className="config-page__header">
        <div className="config-page__title-row">
          <h1 className="config-page__title">Configuración</h1>
          {isMockMode && (
            <span className="config-page__mock-badge">Datos de ejemplo</span>
          )}
        </div>
        <p className="config-page__subtitle">
          Conecta tu CMDB para cargar el stack tecnológico.
        </p>
      </header>

      {/* ── Estado 1 & 2: dos columnas ── */}
      {(step === 'select' || step === 'form') && (
        <div className="config-page__columns">
          <ConfigStepPanel activeStep={stepNumber} connected={false} />

          {step === 'select' && (
            <CmdbSelector onSelect={handleSelectProvider} />
          )}

          {step === 'form' && (
            <ItopForm
              initialUrl={editUrl}
              initialUser={editUser}
              isTesting={isTesting}
              isConnecting={isConnecting}
              testResult={testResult}
              onBack={() => { setStep('select'); setTestResult(null) }}
              onTest={handleTest}
              onConnect={handleConnect}
            />
          )}
        </div>
      )}

      {/* ── Estado 3: conectado ── */}
      {step === 'connected' && connection && (
        <>
          <ConnectedBar
            connection={connection}
            isSyncing={isSyncing}
            showConfirm={showConfirm}
            onDisconnect={handleDisconnectClick}
            onEdit={handleEdit}
            onSync={handleSync}
            onConfirmDisconnect={handleConfirmDisconnect}
            onCancelDisconnect={() => setShowConfirm(false)}
          />

          <section className="config-page__section">
            <div className="config-page__section-header">
              <h2 className="config-page__section-title">Stack tecnológico</h2>
              {isMockMode && assetsLoaded && (
                <span className="config-page__section-meta">
                  {assets.length} activos · fuente: iTop
                </span>
              )}
            </div>

            {!assetsLoaded
              ? <div className="config-page__state">Cargando inventario…</div>
              : <TechStackTable assets={assets} />
            }
          </section>
        </>
      )}
    </main>
  )
}
