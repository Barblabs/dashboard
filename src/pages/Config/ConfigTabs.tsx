import { useTranslation } from 'react-i18next'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import { AreasTable } from './AreasTable'
import { TechStackTable } from './TechStackTable'

const TABS = ['techStack', 'areas'] as const

/*
 * Base UI unmounts a hidden panel, so the areas are only requested once their tab opens.
 * The tech stack stays mounted instead: its filters and page are local state, and
 * visiting the areas must not reset them.
 */
export function ConfigTabs({ readOnly }: { readOnly: boolean }) {
  const { t } = useTranslation()

  return (
    <Tabs defaultValue="techStack" className="overflow-hidden rounded-lg border border-border-panel bg-white">
      <TabList label={t('config.tabs.label')}>
        {TABS.map((tab) => (
          <Tab key={tab} value={tab}>
            {t(`config.tabs.${tab}`)}
          </Tab>
        ))}
      </TabList>
      <TabPanel value="techStack" keepMounted>
        <TechStackTable />
      </TabPanel>
      <TabPanel value="areas">
        <AreasTable readOnly={readOnly} />
      </TabPanel>
    </Tabs>
  )
}
