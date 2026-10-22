import { lazy, Suspense, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Sidebar } from './components/Sidebar'
import { ConfigPage } from './pages/Config'
import { FindingsPage } from './pages/Findings'
import { ForbiddenPage } from './pages/Forbidden'
import { NotFoundPage } from './pages/NotFound'
import { NotificationsPage } from './pages/Notifications'
import './i18n'

// The dynamic import behind DEV keeps the devtools out of the production build.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null

const DEFAULT_PATH = '/config'

function createAppRouter() {
  return createBrowserRouter([
    {
      element: <AppLayout />,
      children: [
        { index: true, element: <Navigate to={DEFAULT_PATH} replace /> },
        { path: 'findings', element: <FindingsPage /> },
        { path: 'config', element: <ConfigPage /> },
        { path: 'notifications', element: <NotificationsPage /> },
        { path: 'forbidden', element: <ForbiddenPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ])
}

function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <Outlet />
    </div>
  )
}

export function App() {
  // One client and router per mount: every test starts with an empty cache and the current URL.
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
