import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSourceQuery, type CmdbSource } from '../../api/cmdb'
import { useCurrentUser } from '../../auth/store'
import { Button } from '../../components/ui/Button'
import { ConfigStepPanel } from './ConfigStepPanel'
import { CmdbSelector } from './CmdbSelector'
import { ItopForm } from './ItopForm'
import { ConnectedBar } from './ConnectedBar'
import { EditConnectionDialog } from './EditConnectionDialog'
import { ConfigTabs } from './ConfigTabs'

type View =
  | { step: 'loading' }
  | { step: 'failed' }
  | { step: 'select' }
  | { step: 'form' }
  | { step: 'connected'; source: CmdbSource }

/*
 * `source` is undefined until the backend has answered once: without that answer the
 * page cannot tell "not connected" apart, so it must not offer to connect. A failed
 * refetch keeps the source it already had.
 */
function deriveView(isPending: boolean, connecting: boolean, source: CmdbSource | null | undefined): View {
  if (isPending) return { step: 'loading' }
  if (source === undefined) return { step: 'failed' }
  if (connecting) return { step: 'form' }
  if (source) return { step: 'connected', source }
  return { step: 'select' }
}

const PAGE = 'flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8'

const NEW_CONNECTION = { url: '', user: '' }

export function ConfigPage() {
  const { t } = useTranslation()
  const sourceQuery = useSourceQuery()
  const role = useCurrentUser()?.role
  const readOnly = role === 'viewer'

  const [connecting, setConnecting] = useState(false)
  const [editing, setEditing] = useState(false)
  const view = deriveView(sourceQuery.isPending, connecting, sourceQuery.data)

  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-1.5">
        <h1 className="font-title text-[1.875rem] leading-[1.15] tracking-[-0.01em] text-navy">
          {t('config.header.title')}
        </h1>
        <p className="font-body text-[0.9375rem] leading-[1.4] text-gray">
          {t('config.header.subtitle')}
        </p>
      </header>

      {view.step === 'loading' ? (
        <div className="py-12 text-center text-[0.875rem] text-gray">{t('config.loading')}</div>
      ) : view.step === 'failed' ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="font-body text-[0.875rem] text-critical">{t('config.loadFailed')}</p>
          <Button variant="secondary" size="sm" onClick={() => void sourceQuery.refetch()}>
            {t('config.retry')}
          </Button>
        </div>
      ) : view.step === 'connected' ? (
        <div className="flex animate-fade-in flex-col gap-6">
          <ConnectedBar source={view.source} onEdit={() => setEditing(true)} readOnly={readOnly} />
          <ConfigTabs readOnly={readOnly} />
          {!readOnly && (
            <EditConnectionDialog
              source={view.source}
              open={editing}
              onClose={() => setEditing(false)}
            />
          )}
        </div>
      ) : readOnly ? (
        <p className="animate-fade-in py-12 text-center font-body text-[0.9375rem] text-gray">
          {t('config.viewer.notConnected')}
        </p>
      ) : (
        <div className="flex items-start gap-[22px]">
          <ConfigStepPanel activeStep={view.step === 'select' ? 1 : 2} />
          {view.step === 'form' ? (
            <ItopForm
              className="animate-fade-in"
              mode="connect"
              initialValues={NEW_CONNECTION}
              onBack={() => setConnecting(false)}
              onSaved={() => setConnecting(false)}
            />
          ) : (
            <CmdbSelector className="animate-fade-in" onSelect={() => setConnecting(true)} />
          )}
        </div>
      )}
    </main>
  )
}
