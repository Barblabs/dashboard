import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Wordmark } from '../../components/Wordmark'
import { WRAP } from './layout'
import { PrimaryAction } from './PrimaryAction'

export function ClosingCta() {
  const { t } = useTranslation()

  return (
    <footer className="flex min-h-svh flex-col bg-navy pb-[env(safe-area-inset-bottom)]">
      <div className={`${WRAP} flex flex-1 flex-col items-start justify-center gap-8 py-24`}>
        <img src="/castle-logo.svg" alt="" className="size-20" aria-hidden="true" />
        <h2 className="max-w-[20ch] font-title text-[2.25rem] leading-[1.08] tracking-[-0.015em] text-white md:text-[3.5rem]">
          {t('landing.closing.title')}
        </h2>
        <p className="max-w-[48ch] font-body text-[1.0625rem] leading-[1.6] text-nav-text">{t('landing.closing.lead')}</p>
        <PrimaryAction size="lg" />
      </div>
      <div className="border-t border-white/10">
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-6`}>
          <div className="flex items-center gap-2.5">
            <img src="/castle-logo.svg" alt="" className="size-6" aria-hidden="true" />
            <Wordmark />
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  )
}
