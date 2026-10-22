import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import { i18n } from '../../i18n'
import { mockAssetsResponse } from '../../mocks/assets'
import { saveConnection } from '../../mocks/handlers'
import { server } from '../../test/server'

// The asset count only appears in mock mode.
vi.mock('../../env', () => ({ isMockMode: true }))

const API = import.meta.env.VITE_API_URL as string

function renderConnected() {
  saveConnection({
    provider: 'itop',
    url: 'http://10.0.0.5:8000',
    user: 'barb-reader',
    lastSync: new Date().toISOString(),
  })
  render(<App />)
}

function serveOneAsset() {
  server.use(
    http.get(`${API}/assets`, () =>
      HttpResponse.json({ assets: mockAssetsResponse.assets.slice(0, 1) }),
    ),
  )
}

describe('Tech stack count', () => {
  it('pluralizes the count in English', async () => {
    renderConnected()
    expect(await screen.findByText('5 assets · source: iTop')).toBeInTheDocument()
  })

  it('uses the singular in English with one asset', async () => {
    serveOneAsset()
    renderConnected()
    expect(await screen.findByText('1 asset · source: iTop')).toBeInTheDocument()
  })

  it('pluralizes the count in Spanish', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    renderConnected()
    expect(await screen.findByText('5 activos · fuente: iTop')).toBeInTheDocument()
  })

  it('uses the singular in Spanish with one asset', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    serveOneAsset()
    renderConnected()
    expect(await screen.findByText('1 activo · fuente: iTop')).toBeInTheDocument()
  })
})
