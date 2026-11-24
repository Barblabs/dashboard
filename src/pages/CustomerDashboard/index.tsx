import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'
import { Page } from '../../components/Page'
import { ChartErrorBoundary } from '../../components/ui/ChartErrorBoundary'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import { BeforeAfterTabContent } from '../Findings/BeforeAfterTab'
import { RiskTabContent } from '../Findings/RiskTab'
import { SummaryIndicators } from '../Findings/SummaryIndicators'
import { SummaryTabContent } from '../Findings/SummaryTab'
import { ThreatsTabContent } from '../Findings/ThreatsTab'

export function CustomerDashboardPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'summary'

  if (tab === 'closed') return <Navigate to="/findings?tab=closed" replace />

  const changeTab = (value: string) => {
    setParams(() => {
      const next = new URLSearchParams()
      next.set('tab', value)
      return next
    })
  }

  return (
    <Page title={t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
      <ChartErrorBoundary>
        <SummaryIndicators />
      </ChartErrorBoundary>
      <Tabs value={tab} onValueChange={changeTab}>
        <TabList label={t('findings.tabs.label')}>
          <Tab value="summary">{t('findings.tabs.summary')}</Tab>
          <Tab value="before-after">{t('findings.tabs.beforeAfter')}</Tab>
          <Tab value="risk">{t('findings.tabs.risk')}</Tab>
          <Tab value="threats">{t('findings.tabs.threats')}</Tab>
        </TabList>

        <TabPanel value="summary" className="mt-6">
          <SummaryTabContent />
        </TabPanel>
        <TabPanel value="before-after" className="mt-6">
          <BeforeAfterTabContent />
        </TabPanel>
        <TabPanel value="risk" className="mt-6">
          <RiskTabContent />
        </TabPanel>
        <TabPanel value="threats" className="mt-6">
          <ThreatsTabContent />
        </TabPanel>
      </Tabs>
    </Page>
  )
}
