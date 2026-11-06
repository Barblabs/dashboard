import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { useAuthStore, type Role } from './auth/store'
import { Sidebar } from './components/Sidebar'
import { AdminDashboardPage } from './pages/AdminDashboard'
import { BusinessContextPage } from './pages/BusinessContext'
import { ConfigPage } from './pages/Config'
import { DeactivatedPage } from './pages/Deactivated'
import { FindingsPage } from './pages/Findings'
import { ForbiddenPage } from './pages/Forbidden'
import { LoginPage } from './pages/Login'
import { NotFoundPage } from './pages/NotFound'
import { NotificationsPage } from './pages/Notifications'
import { TenantsPage } from './pages/Tenants'
import { UsersPage } from './pages/Users'
import './i18n'

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null

const CUSTOMER_ROLES: Role[] = ['customer_admin', 'viewer']

function AuthGuard() {
  const user = useAuthStore((s) => s.user)
  const deactivated = useAuthStore((s) => s.deactivated)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) queryClient.clear()
  }, [user, queryClient])

  if (deactivated) return <Navigate to="/deactivated" replace />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) return <Navigate to="/forbidden" replace />
  return <>{children}</>
}

function DefaultRedirect() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  return <Navigate to={user.role === 'platform_admin' ? '/tenants' : '/config'} replace />
}

// The page scrolls inside its main, so the sidebar and anything sticky in a page stay in view.
function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <Outlet />
    </div>
  )
}

function createAppRouter() {
  return createBrowserRouter([
    { path: 'login', element: <LoginPage /> },
    { path: 'deactivated', element: <DeactivatedPage /> },
    {
      element: <AuthGuard />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { index: true, element: <DefaultRedirect /> },
            {
              path: 'findings',
              element: <RoleGuard roles={CUSTOMER_ROLES}><FindingsPage /></RoleGuard>,
            },
            {
              path: 'config',
              element: <RoleGuard roles={CUSTOMER_ROLES}><ConfigPage /></RoleGuard>,
            },
            {
              path: 'business-context',
              element: <RoleGuard roles={CUSTOMER_ROLES}><BusinessContextPage /></RoleGuard>,
            },
            {
              path: 'notifications',
              element: <RoleGuard roles={CUSTOMER_ROLES}><NotificationsPage /></RoleGuard>,
            },
            {
              path: 'users',
              element: <RoleGuard roles={['customer_admin']}><UsersPage /></RoleGuard>,
            },
            {
              path: 'tenants',
              element: <RoleGuard roles={['platform_admin']}><TenantsPage /></RoleGuard>,
            },
            {
              path: 'admin-dashboard',
              element: <RoleGuard roles={['platform_admin']}><AdminDashboardPage /></RoleGuard>,
            },
            { path: 'forbidden', element: <ForbiddenPage /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ])
}

export function App() {
  const [queryClient] = useState(() => new QueryClient())
  const [router] = useState(createAppRouter)

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
