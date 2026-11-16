import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'
import { i18nReady } from './i18n'
import { MOCK_MODE } from './mockMode'

async function main() {
  if (MOCK_MODE) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
  }

  await i18nReady

  const root = document.getElementById('root')
  if (!root) throw new Error('No root element found')

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void main()
