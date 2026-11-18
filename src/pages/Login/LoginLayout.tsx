import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Wordmark } from '../../components/Wordmark'

export function LoginLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen">
      <div className="flex w-[560px] shrink-0 flex-col justify-between bg-navy px-14 pb-12 pt-14">
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

      <div className="flex flex-1 items-center justify-center bg-panel p-10">
        {children}
      </div>
    </div>
  )
}
