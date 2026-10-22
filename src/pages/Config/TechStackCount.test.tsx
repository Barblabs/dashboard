import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import { i18n } from '../../i18n'
import { mockAssetsResponse } from '../../mocks/assets'
import { saveConnection } from '../../mocks/handlers'
import { server } from '../../test/server'

// El conteo de activos solo aparece en modo mock.
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

describe('Conteo del stack tecnológico', () => {
  it('pluraliza el conteo en inglés', async () => {
    renderConnected()
    expect(await screen.findByText('5 assets · source: iTop')).toBeInTheDocument()
  })

  it('usa el singular en inglés con un activo', async () => {
    serveOneAsset()
    renderConnected()
    expect(await screen.findByText('1 asset · source: iTop')).toBeInTheDocument()
  })

  it('pluraliza el conteo en español', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    renderConnected()
    expect(await screen.findByText('5 activos · fuente: iTop')).toBeInTheDocument()
  })

  it('usa el singular en español con un activo', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    serveOneAsset()
    renderConnected()
    expect(await screen.findByText('1 activo · fuente: iTop')).toBeInTheDocument()
  })
})
