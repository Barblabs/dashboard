import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnectionQuery } from '../../api/queries'
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
  }

  /* Volver a la lista al conectar: así una desconexión posterior regresa a la selección. */
  function handleConnected() {
    setIsEditing(false)
    setSetupStep('select')
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
              onConnected={handleConnected}
            />
          )}
        </div>
      )}

      {/* ── Estado 3: conectado ── */}
      {step === 'connected' && connection && (
        <>
          <ConnectedBar connection={connection} onEdit={handleEdit} />

          <TechStackTable />
        </>
      )}
    </main>
  )
}
