import type { CognitoUser } from 'amazon-cognito-identity-js'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { returnToOf } from '../../auth/returnTo'
import { useAuthStore, useCurrentUser } from '../../auth/store'
import { MOCK_MODE } from '../../mockMode'
import { homePath } from '../../routes'
import { CredentialsForm } from './CredentialsForm'
import { LoginLayout } from './LoginLayout'
import { MockSignIn } from './MockSignIn'
import { NewPasswordForm } from './NewPasswordForm'

type Step =
  | { kind: 'credentials' }
  | { kind: 'newPassword'; cognitoUser: CognitoUser }

/*
 * Signing in moves the session; this page follows it wherever it lands: back to the page
 * that was asked for, or else the role's home. RoleGuard handles a page the role cannot see.
 */
export function LoginPage() {
  const user = useCurrentUser()
  const returnTo = returnToOf(useLocation().state)
  const deactivated = useAuthStore((s) => s.session.status === 'deactivated')
  const [step, setStep] = useState<Step>({ kind: 'credentials' })

  if (deactivated) return <Navigate to="/deactivated" replace />
  if (user) return <Navigate to={returnTo ?? homePath(user.role)} replace />
  if (MOCK_MODE) return <MockSignIn />

  return (
    <LoginLayout>
      {step.kind === 'credentials' ? (
        <CredentialsForm
          onNewPasswordRequired={(cognitoUser) => setStep({ kind: 'newPassword', cognitoUser })}
        />
      ) : (
        <NewPasswordForm cognitoUser={step.cognitoUser} />
      )}
    </LoginLayout>
  )
}
