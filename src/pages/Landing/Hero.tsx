import { useTranslation } from 'react-i18next'
import { FindingsPreview } from './FindingsPreview'
import { WRAP } from './layout'
import { PrimaryAction } from './PrimaryAction'

const ENTER = 'motion-safe:animate-rise-in motion-reduce:animate-fade-in'

export function Hero() {
  const { t } = useTranslation()

  return (
    <section id="top" className="flex min-h-svh flex-col justify-center bg-navy pt-[calc(4rem+env(safe-area-inset-top))] pb-16">
      <div className={`${WRAP} grid items-center gap-12 py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16`}>
        <div className="flex flex-col items-start">
          <h1 className={`font-title text-balance text-[2.5rem] leading-[1.05] tracking-[-0.015em] text-white sm:text-[3.25rem] xl:text-[3.75rem] ${ENTER} [animation-delay:0ms]`}>
            {t('landing.hero.title')}
          </h1>
          <p className={`mt-6 max-w-[46ch] font-body text-[1.0625rem] leading-[1.6] text-nav-text ${ENTER} [animation-delay:160ms]`}>
            {t('landing.hero.lead')}
          </p>
          <div className={`mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 ${ENTER} [animation-delay:240ms]`}>
            <PrimaryAction size="lg" />
            <a
              href="#steps"
              className="rounded-md py-2.5 font-body text-[0.9375rem] font-semibold text-white underline decoration-white/30 underline-offset-4 transition-[text-decoration-color] duration-150 ease-[ease] hover:decoration-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              {t('landing.hero.secondary')}
            </a>
          </div>
        </div>
        <div className={`${ENTER} [animation-delay:320ms]`}>
          <FindingsPreview />
        </div>
      </div>
    </section>
  )
}
