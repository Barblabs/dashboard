import type { ReactNode } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'

export const Tabs = BaseTabs.Root

export function TabList({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <BaseTabs.List
      aria-label={label}
      className="relative flex gap-1 overflow-x-auto border-b border-border-panel px-4"
    >
      {children}
      <BaseTabs.Indicator className="absolute bottom-[-1px] left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) bg-cyan transition-[translate,width] duration-200 ease-out" />
    </BaseTabs.List>
  )
}

// `group` lets content inside the tab, such as a step number, follow the active state.
export function Tab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <BaseTabs.Tab
      value={value}
      className="group flex cursor-pointer items-center gap-2 px-3 py-4 font-body text-[0.9375rem] whitespace-nowrap text-gray outline-none transition-colors hover:text-navy focus-visible:text-navy data-active:font-semibold data-active:text-navy"
    >
      {children}
    </BaseTabs.Tab>
  )
}

export function TabPanel({ className = '', ...props }: Omit<BaseTabs.Panel.Props, 'className'> & { className?: string }) {
  return <BaseTabs.Panel className={`outline-none ${className}`} {...props} />
}
