import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Wordmark } from '../../components/Wordmark'
import { WRAP } from './layout'
import { PrimaryAction } from './PrimaryAction'

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-floating border-b border-white/10 bg-navy pt-[env(safe-area-inset-top)]">
      <div className={`${WRAP} flex h-16 items-center gap-6`}>
        <a href="#top" className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan">
          <img src="/castle-logo.svg" alt="" className="size-8" aria-hidden="true" />
          <Wordmark />
        </a>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <PrimaryAction />
        </div>
      </div>
    </header>
  )
}
