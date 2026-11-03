import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useAuthStore } from '../../auth/store'
import { Button } from '../../components/ui/Button'

export function DeactivatedPage() {
  const { t } = useTranslation()
  const clearSession = useAuthStore((s) => s.clearSession)
  const navigate = useNavigate()

  function handleSignOut() {
    clearSession()
    void navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-panel px-8 text-center">
      <h1 className="font-title text-[1.5rem] text-navy">{t('deactivated.title')}</h1>
      <p className="max-w-md font-body text-[0.9375rem] leading-[1.5] text-gray">
        {t('deactivated.message')}
      </p>
      <Button variant="secondary" onClick={handleSignOut}>
        {t('deactivated.signOut')}
      </Button>
    </main>
  )
}
