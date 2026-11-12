import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setMockRole } from '../../auth/mockTokens'
import { completeSignIn } from '../../auth/session'
import type { Role } from '../../auth/store'
import { Wordmark } from '../../components/Wordmark'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'

const MOCK_ROLES: readonly Role[] = ['platform_admin', 'customer_admin', 'viewer']

// Picking a role stands in for Cognito storing tokens; the rest is the real sign-in.
export function MockSignIn() {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  async function signInAs(role: Role) {
    setServerError(null)
    setMockRole(role)
    const failure = await completeSignIn()
    if (failure) setServerError(t(failure))
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-panel px-8">
      <div className="flex flex-col items-center gap-2">
        <Wordmark size="lg" background="light" />
        <p className="font-body text-[0.9375rem] text-gray">{t('login.mock.subtitle')}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <h1 className="font-body text-[0.8125rem] font-semibold uppercase tracking-wider text-gray">
          {t('login.mock.title')}
        </h1>
        {serverError && (
          <Alert tone="error">{serverError}</Alert>
        )}
        {MOCK_ROLES.map((role) => (
          <Button
            key={role}
            variant="secondary"
            className="w-full justify-start"
            onClick={() => { void signInAs(role) }}
          >
            {t(`login.mock.role.${role}`)}
          </Button>
        ))}
      </div>
    </main>
  )
}
