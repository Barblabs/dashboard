import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnectionQuery } from '../../api/queries'
import type { CmdbConnection, CmdbCredentials } from '../../api/types'
import { Badge } from '../../components/ui/Badge'
import { isMockMode } from '../../env'
import { ConfigStepPanel } from './ConfigStepPanel'
import { CmdbSelector } from './CmdbSelector'
import { ItopForm } from './ItopForm'
import { ConnectedBar } from './ConnectedBar'
import { TechStackTable } from './TechStackTable'

type SetupView =
  | { step: 'select' }
  | { step: 'form'; initialValues: Pick<CmdbCredentials, 'url' | 'user'> }

const PAGE = 'flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8'

export function ConfigPage() {
  const { t } = useTranslation()
  const connectionQuery = useConnectionQuery()
  const connection = connectionQuery.data ?? null

  /* An open setup view wins over the connection, so editing a live connection shows the
     form; with none open the page follows the connection. */
  const [setupView, setSetupView] = useState<SetupView | null>(null)
  const step =
    connectionQuery.isPending ? 'loading'
    : setupView ? setupView.step
    : connection ? 'connected'
    : 'select'

  /* ── handlers ── */

  function handleSelectProvider() {
    setSetupView({ step: 'form', initialValues: { url: '', user: '' } })
  }

  /* The password never goes through here: only the address and user are prefilled. */
  function handleEdit(current: CmdbConnection) {
    setSetupView({ step: 'form', initialValues: { url: current.url, user: current.user } })
  }

  /* ── render ── */

  if (step === 'loading') {
    return (
      <main className={PAGE}>
        <div className="py-12 text-center text-[14px] text-gray">{t('config.loading')}</div>
      </main>
    )
  }

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

      {/* ── States 1 & 2: two columns ── */}
      {(step === 'select' || step === 'form') && (
        <div className="flex items-start gap-[22px]">
          <ConfigStepPanel activeStep={step === 'select' ? 1 : 2} connected={false} />

          {setupView?.step === 'form' ? (
            <ItopForm
              initialValues={setupView.initialValues}
              onBack={() => setSetupView({ step: 'select' })}
              onConnected={() => setSetupView(null)}
            />
          ) : (
            <CmdbSelector onSelect={handleSelectProvider} />
          )}
        </div>
      )}

      {/* ── State 3: connected ── */}
      {step === 'connected' && connection && (
        <>
          <ConnectedBar connection={connection} onEdit={() => handleEdit(connection)} />

          <TechStackTable />
        </>
      )}
    </main>
  )
}
