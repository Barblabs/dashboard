import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'
import { isMockMode } from './env'

// La importación dinámica bajo isMockMode deja MSW y los datos de ejemplo fuera del build.
async function startMockWorker() {
  if (!isMockMode) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

const root = document.getElementById('root')
if (!root) throw new Error('No root element found')

// Si el worker falla se renderiza igual: mejor errores de red visibles que una página en blanco.
startMockWorker()
  .catch((error: unknown) => console.error('No se pudo iniciar el mock de MSW', error))
  .then(() => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
