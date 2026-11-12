import { zodResolver } from '@hookform/resolvers/zod'
import type { CognitoUser } from 'amazon-cognito-identity-js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router'
import { z } from 'zod'
import { completeNewPassword, signIn } from '../../auth/cognito'
import { setMockRole } from '../../auth/mockTokens'
import { returnToOf } from '../../auth/returnTo'
import { completeSignIn } from '../../auth/session'
import { useAuthStore, useCurrentUser, type Role } from '../../auth/store'
import { Wordmark } from '../../components/Wordmark'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MOCK_MODE } from '../../mockMode'
import { homePath } from '../../routes'

// ── Mock roles (VITE_USE_MOCK=true) ─────────────────────────────────────────

const MOCK_ROLES: readonly Role[] = ['platform_admin', 'customer_admin', 'viewer']

// ── Helpers ──────────────────────────────────────────────────────────────────

type LoginErrorKey =
  | 'login.errors.badCredentials'
  | 'login.errors.userDisabled'
  | 'login.errors.network'
  | 'login.errors.passwordPolicy'

function cognitoErrorKey(err: unknown): LoginErrorKey {
  if (err instanceof Error) {
    if (err.name === 'NotAuthorizedException' || err.name === 'UserNotFoundException') {
      return 'login.errors.badCredentials'
    }
    if (err.name === 'InvalidPasswordException' || err.name === 'InvalidParameterException') {
      return 'login.errors.passwordPolicy'
    }
  }
  return 'login.errors.network'
}

// ── Shared layout wrapper ────────────────────────────────────────────────────

function LoginLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
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

      {/* Right access panel */}
      <div className="flex flex-1 items-center justify-center bg-panel p-10">
        {children}
      </div>
    </div>
  )
}

// ── Step 1: credentials ──────────────────────────────────────────────────────

const credSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})
type CredFields = z.infer<typeof credSchema>

interface CredFormProps {
  onNewPasswordRequired: (cognitoUser: CognitoUser) => void
}

function CredentialsForm({ onNewPasswordRequired }: CredFormProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<CredFields>({
    resolver: zodResolver(credSchema),
  })

  async function onSubmit({ email, password }: CredFields) {
    setServerError(null)
    try {
      const result = await signIn(email, password)

      if (result.kind === 'newPasswordRequired') {
        onNewPasswordRequired(result.cognitoUser)
        return
      }

      const failure = await completeSignIn()
      if (failure) setServerError(t(failure))
    } catch (err) {
      setServerError(t(cognitoErrorKey(err)))
    }
  }

  return (
    <form
      onSubmit={(e) => { void handleSubmit(onSubmit)(e) }}
      className="flex w-[420px] flex-col gap-[18px] rounded-xl border border-border-panel bg-white px-8 pb-7 pt-8"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="font-title text-[1.625rem] leading-[1.15] text-navy">
          {t('login.form.title')}
        </h1>
        <p className="font-body text-[0.9375rem] leading-[1.4] text-gray">
          {t('login.form.access')}
        </p>
      </div>

      {serverError && (
        <Alert tone="error">{serverError}</Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-body text-[0.875rem] font-semibold text-navy">
          {t('login.form.email')}
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t('login.form.emailPlaceholder')}
          {...register('email')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-body text-[0.875rem] font-semibold text-navy">
          {t('login.form.password')}
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          {...register('password')}
        />
      </div>

      <Button type="submit" variant="secondary" size="lg" loading={isSubmitting} className="w-full justify-center">
        {isSubmitting ? t('login.form.submitting') : t('login.form.submit')}
      </Button>

      <Alert tone="info">{t('login.form.notice')}</Alert>
    </form>
  )
}

// ── Step 2: new password ─────────────────────────────────────────────────────

const newPwSchema = z.object({
  newPassword: z.string().min(1),
})
type NewPwFields = z.infer<typeof newPwSchema>

interface NewPasswordFormProps {
  cognitoUser: CognitoUser
}

function NewPasswordForm({ cognitoUser }: NewPasswordFormProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<NewPwFields>({
    resolver: zodResolver(newPwSchema),
  })

  async function onSubmit({ newPassword }: NewPwFields) {
    setServerError(null)
    try {
      await completeNewPassword(cognitoUser, newPassword)
      const failure = await completeSignIn()
      if (failure) setServerError(t(failure))
    } catch (err) {
      setServerError(t(cognitoErrorKey(err)))
    }
  }

  return (
    <form
      onSubmit={(e) => { void handleSubmit(onSubmit)(e) }}
      className="flex w-[420px] flex-col gap-[18px] rounded-xl border border-border-panel bg-white px-8 pb-7 pt-8"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="font-title text-[1.625rem] leading-[1.15] text-navy">
          {t('login.newPassword.title')}
        </h1>
        <p className="font-body text-[0.9375rem] leading-[1.4] text-gray">
          {t('login.newPassword.subtitle')}
        </p>
      </div>

      {serverError && (
        <Alert tone="error">{serverError}</Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="font-body text-[0.875rem] font-semibold text-navy">
          {t('login.newPassword.label')}
        </label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
        />
        <p className="font-body text-[0.8125rem] leading-[1.4] text-gray">
          {t('login.newPassword.policy')}
        </p>
      </div>

      <Button type="submit" variant="secondary" size="lg" loading={isSubmitting} className="w-full justify-center">
        {isSubmitting ? t('login.newPassword.submitting') : t('login.newPassword.submit')}
      </Button>
    </form>
  )
}

// ── Mock sign-in (VITE_USE_MOCK=true) ─────────────────────────────────────────

// Picking a role stands in for Cognito storing tokens; the rest is the real sign-in.
function MockSignIn() {
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

// ── Page ─────────────────────────────────────────────────────────────────────

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
