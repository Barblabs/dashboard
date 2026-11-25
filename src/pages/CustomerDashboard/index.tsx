import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'
import { Page } from '../../components/Page'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import { BeforeAfterTabContent } from '../Findings/BeforeAfterTab'
import { ThreatsTabContent } from '../Findings/ThreatsTab'
import { Overview } from './Overview'
import { SyncLine } from './SyncLine'

const OVERVIEW = 'overview'
const ANALYSIS = 'analysis'
const LEGACY_ANALYSIS_TABS = new Set(['before-after', 'threats'])

export function CustomerDashboardPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab')

  if (tab === 'closed') return <Navigate to="/findings?tab=closed" replace />
  if (tab !== null && LEGACY_ANALYSIS_TABS.has(tab)) return <Navigate to={`/dashboard?tab=${ANALYSIS}`} replace />
  if (tab !== null && tab !== ANALYSIS) return <Navigate to="/dashboard" replace />

  const changeTab = (value: string) => {
    setParams(() => {
      const next = new URLSearchParams()
      if (value === ANALYSIS) next.set('tab', ANALYSIS)
      return next
    })
  }

  return (
    <Page title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
      <SyncLine />
      <Tabs value={tab ?? OVERVIEW} onValueChange={changeTab}>
        <TabList label={t('findings.tabs.label')}>
          <Tab value={OVERVIEW}>{t('dashboard.tabs.overview')}</Tab>
          <Tab value={ANALYSIS}>{t('dashboard.tabs.analysis')}</Tab>
        </TabList>

        <TabPanel value={OVERVIEW} className="mt-6">
          <Overview />
        </TabPanel>
        <TabPanel value={ANALYSIS} className="mt-6 flex flex-col gap-10">
          <section className="flex flex-col gap-4" aria-labelledby="analysis-before-after">
            <h2 id="analysis-before-after" className="font-title text-[1.25rem] text-navy">
              {t('findings.tabs.beforeAfter')}
            </h2>
            <BeforeAfterTabContent />
          </section>
          <section className="flex flex-col gap-4" aria-labelledby="analysis-threats">
            <h2 id="analysis-threats" className="font-title text-[1.25rem] text-navy">
              {t('findings.tabs.threats')}
            </h2>
            <ThreatsTabContent />
          </section>
        </TabPanel>
      </Tabs>
    </Page>
  )
}
