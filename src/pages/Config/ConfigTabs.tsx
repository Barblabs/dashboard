import { Tabs } from '@base-ui/react/tabs'
import { useTranslation } from 'react-i18next'
import { AreasTable } from './AreasTable'
import { TechStackTable } from './TechStackTable'

const TABS = ['techStack', 'areas'] as const

const TAB =
  'cursor-pointer px-3 py-4 font-body text-[0.9375rem] whitespace-nowrap text-gray outline-none transition-colors hover:text-navy focus-visible:text-navy data-active:font-semibold data-active:text-navy'

/*
 * Base UI unmounts a hidden panel, so the areas are only requested once their tab opens.
 * The tech stack stays mounted instead: its filters and page are local state, and
 * visiting the areas must not reset them.
 */
export function ConfigTabs({ readOnly }: { readOnly: boolean }) {
  const { t } = useTranslation()

  return (
    <Tabs.Root
      defaultValue="techStack"
      className="overflow-hidden rounded-lg border border-border-panel bg-white"
    >
      <Tabs.List
        aria-label={t('config.tabs.label')}
        className="relative flex gap-1 overflow-x-auto border-b border-border-panel px-4"
      >
        {TABS.map((tab) => (
          <Tabs.Tab key={tab} value={tab} className={TAB}>
            {t(`config.tabs.${tab}`)}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="absolute bottom-[-1px] left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) bg-cyan transition-[translate,width] duration-200 ease-out" />
      </Tabs.List>
      <Tabs.Panel value="techStack" keepMounted className="outline-none">
        <TechStackTable />
      </Tabs.Panel>
      <Tabs.Panel value="areas" className="outline-none">
        <AreasTable readOnly={readOnly} />
      </Tabs.Panel>
    </Tabs.Root>
  )
}
