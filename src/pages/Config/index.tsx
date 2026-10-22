import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { disconnect, syncNow } from '../../api/cmdb'
import { fetchAssets } from '../../api/assets'
import { connectionQueryKey, useConnectionQuery } from '../../api/queries'
import type { Asset, CmdbConnection } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { isMockMode } from '../../env'
import { ConfigStepPanel } from './ConfigStepPanel'
import { CmdbSelector } from './CmdbSelector'
import { ItopForm } from './ItopForm'
import { ConnectedBar } from './ConnectedBar'
import { TechStackTable } from './TechStackTable'

type SetupStep = 'select' | 'form'

const PAGE = 'flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8'

export function ConfigPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const connectionQuery = useConnectionQuery()
  const connection = connectionQuery.data ?? null

  /* El paso se deriva: solo la elección entre lista y formulario es estado local. */
  const [setupStep, setSetupStep] = useState<SetupStep>('select')
  const [isEditing, setIsEditing] = useState(false)
  const step =
    connectionQuery.isPending ? 'loading'
    : connection && !isEditing ? 'connected'
    : setupStep

  /* valores iniciales del formulario; la contraseña nunca pasa por aquí */
  const [editUrl, setEditUrl]   = useState('')
  const [editUser, setEditUser] = useState('')

  /* async operations */
  const [isSyncing, setIsSyncing] = useState(false)

  /* table */
  const [assets, setAssets]     = useState<Asset[]>([])
  const [assetsLoaded, setAssetsLoaded] = useState(false)

  /* disconnect confirm */
  const [showConfirm, setShowConfirm] = useState(false)

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
    setSetupStep('form')
  }

  function handleEdit() {
    setEditUrl(connection?.url ?? '')
    setEditUser(connection?.user ?? '')
    setIsEditing(true)
    setSetupStep('form')
    setShowConfirm(false)
  }

  function handleDisconnectClick() {
    setShowConfirm(true)
  }

  async function handleConfirmDisconnect() {
    await disconnect()
    queryClient.setQueryData<CmdbConnection | null>(connectionQueryKey, null)
    setIsEditing(false)
    setSetupStep('select')
    setShowConfirm(false)
    setAssets([])
    setAssetsLoaded(false)
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      const { lastSync } = await syncNow()
      queryClient.setQueryData<CmdbConnection | null>(
        connectionQueryKey,
        (current) => current && { ...current, lastSync },
      )
    } finally {
      setIsSyncing(false)
    }
  }

  /* ── render ── */

  if (step === 'loading') {
    return (
      <main className={PAGE}>
        <div className="py-12 text-center text-[14px] text-gray">{t('config.loading')}</div>
      </main>
    )
  }

  const stepNumber: 1 | 2 | 3 =
    step === 'select' ? 1 : step === 'form' ? 2 : 3

  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="font-title text-[30px] leading-[1.15] text-navy">
            {t('config.header.title')}
          </h1>
          {isMockMode && <Badge variant="dashed">{t('config.header.mockBadge')}</Badge>}
        </div>
        <p className="font-body text-[15px] leading-[1.4] text-gray">
          {t('config.header.subtitle')}
        </p>
      </header>

      {/* ── Estado 1 & 2: dos columnas ── */}
      {(step === 'select' || step === 'form') && (
        <div className="flex items-start gap-[22px]">
          <ConfigStepPanel activeStep={stepNumber} connected={false} />

          {step === 'select' && (
            <CmdbSelector onSelect={handleSelectProvider} />
          )}

          {step === 'form' && (
            <ItopForm
              initialUrl={editUrl}
              initialUser={editUser}
              onBack={() => setSetupStep('select')}
              onConnected={() => setIsEditing(false)}
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

          <section className="overflow-hidden rounded-lg border border-border-panel bg-white">
            <div className="flex items-baseline gap-3 border-b border-border-panel px-6 pt-5 pb-4">
              <h2 className="font-title text-[16px] text-navy">Stack tecnológico</h2>
              {isMockMode && assetsLoaded && (
                <span className="font-body text-[13px] text-gray">
                  {assets.length} activos · fuente: iTop
                </span>
              )}
            </div>

            {!assetsLoaded
              ? <div className="px-6 py-12 text-center text-[14px] text-gray">Cargando inventario…</div>
              : <TechStackTable assets={assets} />
            }
          </section>
        </>
      )}
    </main>
  )
}
