import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'
import { isMockMode } from './env'

// The dynamic import behind isMockMode keeps MSW and the sample data out of the build.
async function startMockWorker() {
  if (!isMockMode) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

const root = document.getElementById('root')
if (!root) throw new Error('No root element found')

// Render even if the worker fails: visible network errors beat a blank page.
startMockWorker()
  .catch((error: unknown) => console.error('Failed to start the MSW mock', error))
  .then(() => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
