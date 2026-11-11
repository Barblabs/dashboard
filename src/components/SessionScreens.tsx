import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../auth/store'
import { Button } from './ui/Button'

// Most restorations finish before the delay is up, so the screen just stays blank.
export function RestoringSession() {
  const { t } = useTranslation()
  return (
    <main aria-busy="true" className="flex min-h-screen items-center justify-center bg-panel">
      <p
        role="status"
        className="font-body text-[0.9375rem] text-gray motion-safe:animate-fade-in motion-safe:[animation-delay:400ms] motion-safe:[animation-fill-mode:backwards]"
      >
        {t('session.restoring')}
      </p>
    </main>
  )
}

export function ServerUnreachable() {
  const { t } = useTranslation()
  const retryRestoring = useAuthStore((s) => s.retryRestoring)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-panel px-8 text-center">
      <h1 className="font-title text-[1.5rem] text-navy">{t('session.unreachable.title')}</h1>
      <p className="max-w-md font-body text-[0.9375rem] leading-[1.5] text-gray">
        {t('session.unreachable.message')}
      </p>
      <Button variant="secondary" onClick={retryRestoring}>
        {t('session.unreachable.retry')}
      </Button>
    </main>
  )
}
