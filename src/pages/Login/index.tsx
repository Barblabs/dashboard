import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router'
import { returnToOf } from '../../auth/returnTo'
import { useDocumentTitle } from '../../components/useDocumentTitle'
import { useAuthStore, useCurrentUser } from '../../auth/store'
import { MOCK_MODE } from '../../mockMode'
import { canOpen, homePath } from '../../routes'
import { CredentialsForm } from './CredentialsForm'
import { LoginLayout } from './LoginLayout'
import { MockSignIn } from './MockSignIn'
import { NewPasswordForm } from './NewPasswordForm'

type Step = 'credentials' | 'newPassword'

/*
 * Signing in moves the session; this page follows it wherever it lands: back to the page
 * that was asked for, or else the role's home. RoleGuard handles a page the role cannot see.
 */
export function LoginPage() {
  const user = useCurrentUser()
  const returnTo = returnToOf(useLocation().state)
  const deactivated = useAuthStore((s) => s.session.status === 'deactivated')
  const [step, setStep] = useState<Step>('credentials')
  const { t } = useTranslation()
  useDocumentTitle(t('login.form.title'))

  if (deactivated) return <Navigate to="/deactivated" replace />
  if (user) {
    const destination = returnTo !== null && canOpen(user.role, returnTo) ? returnTo : homePath(user.role)
    return <Navigate to={destination} replace />
  }
  if (MOCK_MODE) return <MockSignIn />

  return (
    <LoginLayout>
      {step === 'credentials' ? (
        <CredentialsForm onNewPasswordRequired={() => setStep('newPassword')} />
      ) : (
        <NewPasswordForm />
      )}
    </LoginLayout>
  )
}
