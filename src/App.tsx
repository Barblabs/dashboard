import { lazy, Suspense, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './components/Sidebar'
import { ConfigPage } from './pages/Config'
import './i18n'
import './App.css'

// La importación dinámica bajo DEV deja las devtools fuera del build de producción.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null

export function App() {
  // Un cliente por montaje: cada prueba arranca con la caché vacía.
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-layout">
        <Sidebar />
        <ConfigPage />
      </div>
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
