import { useTranslation } from 'react-i18next'

interface Props {
  activeStep: 1 | 2 | 3
  connected: boolean
}

const STEPS = ['choose', 'credentials', 'connect'] as const

export function ConfigStepPanel({ activeStep, connected }: Props) {
  const { t } = useTranslation()

  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-4 rounded-xl bg-navy p-6">
      <h2 className="font-title text-[22px] leading-[1.2] text-white">{t('config.steps.title')}</h2>
      <p className="font-body text-[15px] leading-[1.4] text-nav-text">
        {t('config.steps.description')}
      </p>

      <ol className="flex flex-col gap-3 py-2">
        {STEPS.map((step, i) => {
          const n = i + 1
          const isActive = n === activeStep
          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[14px] ${
                  isActive ? 'border-cyan bg-cyan text-navy' : 'border-nav-text text-nav-text'
                }`}
              >
                {n}
              </span>
              <span
                className={`font-body text-[15px] leading-[1.4] ${
                  isActive ? 'font-semibold text-white' : 'text-nav-text'
                }`}
              >
                {t(`config.steps.items.${step}`)}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="flex items-center gap-2 rounded-md border border-nav-text px-3 py-2.5 font-body text-[14px] font-semibold text-white">
        <span className="size-2 shrink-0 rounded-full bg-gray" />
        <span>{t(connected ? 'config.steps.status.connected' : 'config.steps.status.disconnected')}</span>
      </div>
    </aside>
  )
}
