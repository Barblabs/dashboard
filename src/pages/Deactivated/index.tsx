import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router'
import { signOut } from '../../auth/session'
import { useAuthStore } from '../../auth/store'
import { Button } from '../../components/ui/Button'

// Only a deactivated session sees this page; signing out moves the session, and the redirect follows.
export function DeactivatedPage() {
  const { t } = useTranslation()
  const deactivated = useAuthStore((s) => s.session.status === 'deactivated')

  if (!deactivated) return <Navigate to="/" replace />

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-panel px-8 text-center">
      <h1 className="font-title text-[1.5rem] text-navy">{t('deactivated.title')}</h1>
      <p className="max-w-md font-body text-[0.9375rem] leading-[1.5] text-gray">
        {t('deactivated.message')}
      </p>
      <Button variant="secondary" onClick={signOut}>
        {t('deactivated.signOut')}
      </Button>
    </main>
  )
}
