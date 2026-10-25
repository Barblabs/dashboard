import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSourceQuery, type CmdbLogin, type CmdbSource } from '../../api/cmdb'
import { Badge } from '../../components/ui/Badge'
import { isMockMode } from '../../env'
import { ConfigStepPanel } from './ConfigStepPanel'
import { CmdbSelector } from './CmdbSelector'
import { ItopForm, type ItopFormMode } from './ItopForm'
import { ConnectedBar } from './ConnectedBar'
import { TechStackTable } from './TechStackTable'

// The password never goes through here: only the address and user are prefilled.
type SetupView =
  | { step: 'select' }
  | { step: 'form'; mode: ItopFormMode; initialValues: Pick<CmdbLogin, 'url' | 'user'> }

type View = { step: 'loading' } | SetupView | { step: 'connected'; source: CmdbSource }

const PAGE = 'flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8'

export function ConfigPage() {
  const { t } = useTranslation()
  const sourceQuery = useSourceQuery()

  /* An open setup view wins over the source, so editing a live source shows the
     form; with none open the page follows the source. */
  const [setupView, setSetupView] = useState<SetupView | null>(null)
  const source = sourceQuery.data
  const view: View =
    sourceQuery.isPending ? { step: 'loading' }
    : setupView ? setupView
    : source ? { step: 'connected', source }
    : { step: 'select' }

  const editLogin = (source: CmdbSource) =>
    setSetupView({
      step: 'form',
      mode: 'update',
      initialValues: { url: source.url, user: source.user ?? '' },
    })

  if (view.step === 'loading') {
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

      {view.step === 'connected' ? (
        <>
          <ConnectedBar source={view.source} onEdit={() => editLogin(view.source)} />
          <TechStackTable provider={view.source.provider} />
        </>
      ) : (
        <div className="flex items-start gap-[22px]">
          <ConfigStepPanel activeStep={view.step === 'select' ? 1 : 2} />
          {view.step === 'form' ? (
            <ItopForm
              mode={view.mode}
              initialValues={view.initialValues}
              // Changing CMDB needs a disconnect first, so editing goes back to the source.
              onBack={() => setSetupView(view.mode === 'update' ? null : { step: 'select' })}
              onSaved={() => setSetupView(null)}
            />
          ) : (
            <CmdbSelector
              onSelect={() =>
                setSetupView({ step: 'form', mode: 'connect', initialValues: { url: '', user: '' } })
              }
            />
          )}
        </div>
      )}
    </main>
  )
}
