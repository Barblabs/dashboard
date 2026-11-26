import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'

export const Tabs = BaseTabs.Root

function useOverflow() {
  const ref = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ start: false, end: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const update = () => {
      const start = el.scrollLeft > 0
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setOverflow((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    for (const tab of el.children) observer.observe(tab)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [])

  return { ref, overflow }
}

export function TabList({ label, children }: { label?: string; children: ReactNode }) {
  const { ref, overflow } = useOverflow()

  return (
    <BaseTabs.List
      ref={ref}
      aria-label={label}
      data-overflow-start={overflow.start || undefined}
      data-overflow-end={overflow.end || undefined}
      className="relative flex gap-1 overflow-x-auto border-b border-border-panel px-4 [--fade-end:0px] [--fade-start:0px] [mask-image:linear-gradient(to_right,transparent,black_var(--fade-start),black_calc(100%-var(--fade-end)),transparent)] data-overflow-end:[--fade-end:2.5rem] data-overflow-start:[--fade-start:2.5rem]"
    >
      {children}
      <BaseTabs.Indicator className="absolute bottom-[-1px] left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) bg-cyan transition-[translate,width] duration-200 ease-out motion-reduce:transition-none" />
    </BaseTabs.List>
  )
}

// `group` lets content inside the tab, such as a step number, follow the active state.
export function Tab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <BaseTabs.Tab
      value={value}
      className="group flex cursor-pointer items-center gap-2 px-3 py-4 font-body text-[0.9375rem] whitespace-nowrap text-gray outline-none transition-colors duration-150 ease-[ease] hover:text-navy data-active:font-semibold data-active:text-navy focus-visible:rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy"
    >
      {children}
    </BaseTabs.Tab>
  )
}

export function TabPanel({ className = '', ...props }: Omit<BaseTabs.Panel.Props, 'className'> & { className?: string }) {
  return <BaseTabs.Panel className={`outline-none ${className}`} {...props} />
}
