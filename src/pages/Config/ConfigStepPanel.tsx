import { useTranslation } from 'react-i18next'

interface Props {
  activeStep: 1 | 2
}

const STEPS = ['choose', 'credentials', 'connect'] as const

export function ConfigStepPanel({ activeStep }: Props) {
  const { t } = useTranslation()

  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-4 rounded-xl bg-navy p-6">
      <h2 className="font-title text-[1.375rem] leading-[1.2] text-white">{t('config.steps.title')}</h2>
      <p className="font-body text-[0.9375rem] leading-[1.4] text-nav-text">
        {t('config.steps.description')}
      </p>

      <ol className="flex flex-col gap-3 py-2">
        {STEPS.map((step, i) => {
          const n = i + 1
          const isActive = n === activeStep
          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[0.875rem] ${
                  isActive ? 'border-cyan bg-cyan text-navy' : 'border-nav-text text-nav-text'
                }`}
              >
                {n}
              </span>
              <span
                className={`font-body text-[0.9375rem] leading-[1.4] ${
                  isActive ? 'font-semibold text-white' : 'text-nav-text'
                }`}
              >
                {t(`config.steps.items.${step}`)}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="flex items-center gap-2 rounded-md border border-nav-text px-3 py-2.5 font-body text-[0.875rem] font-semibold text-white">
        <span className="size-2 shrink-0 rounded-full bg-gray" />
        <span>{t('config.steps.status.disconnected')}</span>
      </div>
    </aside>
  )
}
