import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router'
import { returnToState } from './auth/returnTo'
import { restoreSession } from './auth/session'
import { useAuthStore, useCurrentUser, type Role } from './auth/store'
import { tokens } from './auth/tokenSource'
import { RestoringSession, ServerUnreachable } from './components/SessionScreens'
import { Sidebar } from './components/Sidebar'
import { DeactivatedPage } from './pages/Deactivated'
import { ForbiddenPage } from './pages/Forbidden'
import { LoginPage } from './pages/Login'
import { NotFoundPage } from './pages/NotFound'
import { homePath, PAGES } from './routes'
import './i18n'

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null

function AuthGuard() {
  const status = useAuthStore((s) => s.session.status)
  const location = useLocation()
  if (status === 'deactivated') return <Navigate to="/deactivated" replace />
  if (status !== 'signedIn') return <Navigate to="/login" replace state={returnToState(location)} />
  return <Outlet />
}

/*
 * Cached data belongs to the session that fetched it. Clearing it here, outside every
 * route, covers each way a session ends, including from pages no guard wraps.
 * Being an effect, it runs after the guards have unmounted the pages that used it.
 */
function useClearCacheWhenSignedOut() {
  const queryClient = useQueryClient()
  const signedOut = useAuthStore((s) => s.session.status === 'signedOut')
  useEffect(() => {
    if (signedOut) queryClient.clear()
  }, [signedOut, queryClient])
}

// Entering `restoring`, on startup or on a retry, is what starts a restoration.
function useRestoreSession() {
  const restoring = useAuthStore((s) => s.session.status === 'restoring')
  useEffect(() => {
    if (restoring) void restoreSession()
  }, [restoring])
}

// The tokens are shared by every tab: once another tab forgets them, this session is over too.
function useEndSessionWhenForgottenElsewhere() {
  const endSession = useAuthStore((s) => s.endSession)
  useEffect(() => tokens.onForgottenElsewhere(endSession), [endSession])
}

/*
 * Until restoring settles no route is rendered, so no guard redirects: a reload stays on
 * the page it was on.
 */
function SessionScope({ children }: { children: ReactNode }) {
  useClearCacheWhenSignedOut()
  useRestoreSession()
  useEndSessionWhenForgottenElsewhere()
  const status = useAuthStore((s) => s.session.status)
  if (status === 'restoring') return <RestoringSession />
  if (status === 'unreachable') return <ServerUnreachable />
  return <>{children}</>
}

function RoleGuard({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const user = useCurrentUser()
  if (!user || !roles.includes(user.role)) return <Navigate to="/forbidden" replace />
  return <>{children}</>
}

function DefaultRedirect() {
  const user = useCurrentUser()
  if (!user) return null
  return <Navigate to={homePath(user.role)} replace />
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
            ...PAGES.map(({ id, Page, roles }) => ({
              path: id,
              element: <RoleGuard roles={roles}><Page /></RoleGuard>,
            })),
            { path: 'forbidden', element: <ForbiddenPage /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ])
}

/*
 * A failed query shows its error right away instead of staying on "Loading" for several
 * seconds while it retries; every error screen offers its own retry.
 */
function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createAppRouter)

  return (
    <QueryClientProvider client={queryClient}>
      <SessionScope>
        <RouterProvider router={router} />
      </SessionScope>
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
