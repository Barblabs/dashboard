import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Wordmark } from '../../components/Wordmark'
import { SECTION_IDS, WRAP } from './layout'
import { PrimaryAction } from './PrimaryAction'

export function LandingNav() {
  const { t } = useTranslation()

  return (
    <header className="fixed inset-x-0 top-0 z-floating border-b border-white/10 bg-navy pt-[env(safe-area-inset-top)]">
      <div className={`${WRAP} flex h-16 items-center gap-6`}>
        <a href="#top" className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan">
          <img src="/castle-logo.svg" alt="" className="size-8" aria-hidden="true" />
          <Wordmark />
        </a>
        <nav aria-label={t('landing.nav.label')} className="hidden flex-1 justify-center gap-1 lg:flex">
          {SECTION_IDS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-md px-3 py-2.5 font-body text-[0.875rem] font-medium text-nav-text transition-colors duration-150 ease-[ease] hover:text-white focus-visible:outline-2 focus-visible:outline-cyan"
            >
              {t(`landing.nav.${id}`)}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <PrimaryAction />
        </div>
      </div>
    </header>
  )
}
