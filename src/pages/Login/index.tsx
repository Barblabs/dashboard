import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { useAuthStore, type AuthUser, type Role } from '../../auth/store'
import { Button } from '../../components/ui/Button'
import { setMockRole } from '../../test/mocks/handlers/auth'

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

export function LoginPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const setSession = useAuthStore((s) => s.setSession)
  const navigate = useNavigate()

  if (user) {
    return <Navigate to={user.role === 'platform_admin' ? '/tenants' : '/config'} replace />
  }

  if (import.meta.env.VITE_USE_MOCK === 'true') {
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
                setSession(mockUser(role, email), 'mock-access-token')
                void navigate(role === 'platform_admin' ? '/tenants' : '/config', { replace: true })
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-panel px-8">
      <span className="font-title text-[2rem] leading-none">
        <span className="text-navy">BARB</span>
        <span className="text-cyan">ATTACK</span>
      </span>
      <p className="font-body text-[0.9375rem] text-gray">{t('login.real.comingSoon')}</p>
    </main>
  )
}
