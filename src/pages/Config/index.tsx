import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSourceQuery, type CmdbSource } from '../../api/cmdb'
import { useCanEdit } from '../../auth/permissions'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import { ConfigStepPanel } from './ConfigStepPanel'
import { CmdbSelector } from './CmdbSelector'
import { ItopForm } from './ItopForm'
import { ConnectedBar } from './ConnectedBar'
import { EditConnectionDialog } from './EditConnectionDialog'
import { ConfigTabs } from './ConfigTabs'
import { SlackPanel } from './SlackPanel'

const KEYS = {
  loading: 'config.loading',
  failed: 'config.loadFailed',
  network: 'config.networkError',
} as const

const NEW_CONNECTION = { url: '', user: '' }

type ConnectStep = 'chooseCmdb' | 'credentials'

const STEP_NUMBER = { chooseCmdb: 1, credentials: 2 } as const satisfies Record<ConnectStep, number>

/*
 * The page holds two halves: the CMDB connection flow (which carries its own nested
 * tabs once connected) and Slack delivery setup. They are siblings because Slack does
 * not depend on the CMDB, so it has to be reachable with no connection configured.
 */
export function ConfigPage() {
  const { t } = useTranslation()
  const sourceQuery = useSourceQuery()
  const readOnly = !useCanEdit()

  return (
    <Page title={t('config.header.title')}>
      <Tabs defaultValue="cmdb">
        <TabList label={t('config.tabs.pageLabel')}>
          <Tab value="cmdb">{t('config.tabs.cmdb')}</Tab>
          <Tab value="slack">{t('config.tabs.slack')}</Tab>
        </TabList>
        <TabPanel value="cmdb">
          <QueryBoundary query={sourceQuery} keys={KEYS}>
            {(source) => <ConfigBody source={source} readOnly={readOnly} />}
          </QueryBoundary>
        </TabPanel>
        <TabPanel value="slack">
          <SlackPanel readOnly={readOnly} />
        </TabPanel>
      </Tabs>
    </Page>
  )
}

function ConfigBody({ source, readOnly }: { source: CmdbSource | null; readOnly: boolean }) {
  const { t } = useTranslation()
  const [step, setStep] = useState<ConnectStep>('chooseCmdb')
  const [editing, setEditing] = useState(false)

  if (source && step !== 'chooseCmdb') setStep('chooseCmdb')

  if (source) {
    return (
      <div className="flex animate-fade-in flex-col gap-6">
        <ConnectedBar source={source} onEdit={() => setEditing(true)} readOnly={readOnly} />
        <ConfigTabs readOnly={readOnly} />
        {!readOnly && (
          <EditConnectionDialog source={source} open={editing} onClose={() => setEditing(false)} />
        )}
      </div>
    )
  }

  if (readOnly) {
    return (
      <p className="animate-fade-in py-12 text-center font-body text-[0.9375rem] text-gray">
        {t('config.viewer.notConnected')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-[22px] md:flex-row md:items-start">
      <ConfigStepPanel activeStep={STEP_NUMBER[step]} />
      {step === 'credentials' ? (
        <ItopForm
          className="animate-fade-in"
          mode="connect"
          initialValues={NEW_CONNECTION}
          onBack={() => setStep('chooseCmdb')}
          onSaved={() => setStep('chooseCmdb')}
        />
      ) : (
        <CmdbSelector className="animate-fade-in" onSelect={() => setStep('credentials')} />
      )}
    </div>
  )
}
