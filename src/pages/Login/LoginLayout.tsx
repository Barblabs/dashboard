import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Wordmark } from '../../components/Wordmark'

export function LoginLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-3 bg-navy px-4 pt-[env(safe-area-inset-top)] md:hidden">
        <img src="/castle-logo.svg" alt="" className="size-8 shrink-0" aria-hidden="true" />
        <Wordmark />
      </header>

      <div className="hidden w-[560px] shrink-0 flex-col justify-between bg-navy px-14 pb-12 pt-14 md:flex">
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-4">
            <img src="/castle-logo.svg" alt="" className="size-16 shrink-0" aria-hidden="true" />
            <Wordmark size="lg" />
          </div>
          <p className="font-title text-[2.125rem] leading-[1.2] text-white">
            {t('login.form.tagline')}
          </p>
          <p className="font-body text-[1rem] leading-[1.4] text-nav-text">
            {t('login.form.subtitle')}
          </p>
        </div>
        <p className="font-body text-[0.8125rem] leading-[1.4] text-nav-text-dim">
          {t('sidebar.footer.course')}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-panel px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-10">
        {children}
      </div>
    </div>
  )
}
