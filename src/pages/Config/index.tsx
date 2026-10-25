import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSourceQuery, type CmdbLogin, type CmdbSource } from '../../api/cmdb'
import { ConfigStepPanel } from './ConfigStepPanel'
import { CmdbSelector } from './CmdbSelector'
import { ItopForm, type ItopFormMode } from './ItopForm'
import { ConnectedBar } from './ConnectedBar'
import { TechStackTable } from './TechStackTable'

type SelectView = { step: 'select' }

interface FormView {
  step: 'form'
  mode: ItopFormMode
  initialValues: Pick<CmdbLogin, 'url' | 'user'>
  back: SelectView | null
}

type SetupView = SelectView | FormView

type View = { step: 'loading' } | SetupView | { step: 'connected'; source: CmdbSource }

function deriveView(
  isPending: boolean,
  setupView: SetupView | null,
  source: CmdbSource | null | undefined,
): View {
  if (isPending) return { step: 'loading' }
  if (setupView) return setupView
  if (source) return { step: 'connected', source }
  return { step: 'select' }
}

const PAGE = 'flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8'

export function ConfigPage() {
  const { t } = useTranslation()
  const sourceQuery = useSourceQuery()

  const [setupView, setSetupView] = useState<SetupView | null>(null)
  const view = deriveView(sourceQuery.isPending, setupView, sourceQuery.data)

  const editLogin = (source: CmdbSource) =>
    setSetupView({
      step: 'form',
      mode: 'update',
      initialValues: { url: source.url, user: source.user ?? '' },
      back: null,
    })

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
      ) : view.step === 'connected' ? (
        <div className="flex animate-fade-in flex-col gap-6">
          <ConnectedBar source={view.source} onEdit={() => editLogin(view.source)} />
          <TechStackTable />
        </div>
      ) : view.step === 'form' && view.mode === 'update' ? (
        // Editing a live connection is not onboarding: no setup steps, no "disconnected" status.
        <div className="flex max-w-2xl">
          <ItopForm
            className="animate-fade-in"
            mode={view.mode}
            initialValues={view.initialValues}
            onBack={() => setSetupView(view.back)}
            onSaved={() => setSetupView(null)}
          />
        </div>
      ) : (
        <div className="flex items-start gap-[22px]">
          <ConfigStepPanel activeStep={view.step === 'select' ? 1 : 2} />
          {view.step === 'form' ? (
            <ItopForm
              className="animate-fade-in"
              mode={view.mode}
              initialValues={view.initialValues}
              onBack={() => setSetupView(view.back)}
              onSaved={() => setSetupView(null)}
            />
          ) : (
            <CmdbSelector
              className="animate-fade-in"
              onSelect={() =>
                setSetupView({
                  step: 'form',
                  mode: 'connect',
                  initialValues: { url: '', user: '' },
                  back: { step: 'select' },
                })
              }
            />
          )}
        </div>
      )}
    </main>
  )
}
