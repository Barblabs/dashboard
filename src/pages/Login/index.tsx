import { zodResolver } from '@hookform/resolvers/zod'
import type { CognitoUser } from 'amazon-cognito-identity-js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { completeNewPassword, signIn } from '../../auth/cognito'
import { completeSignIn } from '../../auth/session'
import { useAuthStore, useCurrentUser, type AuthUser, type Role } from '../../auth/store'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { setMockRole } from '../../test/mocks/handlers/auth'

// ── Mock login (VITE_USE_MOCK=true) ─────────────────────────────────────────

interface MockRoleOption {
  role: Role
  email: string
  labelKey: 'login.mock.platformAdmin' | 'login.mock.customerAdmin' | 'login.mock.viewer'
}

const MOCK_ROLES: MockRoleOption[] = [
  { role: 'platform_admin', email: 'superadmin@barbattack.example', labelKey: 'login.mock.platformAdmin' },
  { role: 'customer_admin', email: 'admin@barbattack.example', labelKey: 'login.mock.customerAdmin' },
  { role: 'viewer', email: 'viewer@barbattack.example', labelKey: 'login.mock.viewer' },
]

function mockUser(role: Role, email: string): AuthUser {
  return {
    id: `mock-${role}`,
    email,
    role,
    customer: role !== 'platform_admin' ? { id: 'mock-customer-id', name: 'ACME Corp' } : null,
  }
}

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

function destForRole(role: Role): string {
  return role === 'platform_admin' ? '/tenants' : '/config'
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
            <span className="font-title text-[2rem] leading-[1.2] whitespace-nowrap">
              <span className="text-white">BARB</span>
              <span className="text-cyan">ATTACK</span>
            </span>
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
  const navigate = useNavigate()
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

      const outcome = await completeSignIn(result.accessToken)
      if (outcome.ok) void navigate(destForRole(outcome.user.role), { replace: true })
      else setServerError(t(outcome.error))
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
        <p role="alert" className="rounded-md bg-critical/10 px-3.5 py-2.5 font-body text-[0.875rem] text-critical">
          {serverError}
        </p>
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

      <p className="rounded-md bg-panel px-3.5 py-3 font-body text-[0.8125rem] leading-[1.4] text-navy">
        {t('login.form.notice')}
      </p>
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
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<NewPwFields>({
    resolver: zodResolver(newPwSchema),
  })

  async function onSubmit({ newPassword }: NewPwFields) {
    setServerError(null)
    try {
      const accessToken = await completeNewPassword(cognitoUser, newPassword)
      const outcome = await completeSignIn(accessToken)
      if (outcome.ok) void navigate(destForRole(outcome.user.role), { replace: true })
      else setServerError(t(outcome.error))
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
        <p role="alert" className="rounded-md bg-critical/10 px-3.5 py-2.5 font-body text-[0.875rem] text-critical">
          {serverError}
        </p>
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

// ── Page ─────────────────────────────────────────────────────────────────────

type Step =
  | { kind: 'credentials' }
  | { kind: 'newPassword'; cognitoUser: CognitoUser }

export function LoginPage() {
  const { t } = useTranslation()
  const user = useCurrentUser()
  const establishSession = useAuthStore((s) => s.establishSession)
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ kind: 'credentials' })

  if (user) {
    return <Navigate to={destForRole(user.role)} replace />
  }

  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-panel px-8">
        <div className="flex flex-col items-center gap-2">
          <span className="font-title text-[2rem] leading-none">
            <span className="text-navy">BARB</span>
            <span className="text-cyan">ATTACK</span>
          </span>
          <p className="font-body text-[0.9375rem] text-gray">{t('login.mock.subtitle')}</p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <p className="font-body text-[0.8125rem] font-semibold uppercase tracking-wider text-gray">
            {t('login.mock.title')}
          </p>
          {MOCK_ROLES.map(({ role, email, labelKey }) => (
            <Button
              key={role}
              variant="secondary"
              className="w-full justify-start"
              onClick={() => {
                setMockRole(role)
                establishSession(mockUser(role, email), 'mock-access-token')
                void navigate(destForRole(role), { replace: true })
              }}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </main>
    )
  }

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
