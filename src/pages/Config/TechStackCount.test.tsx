import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { i18n } from '../../i18n'
import { mockAssetsResponse } from '../../mocks/assets'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedSource } from '../../test/render'
import { server } from '../../test/server'

// The asset count only appears in mock mode.
vi.mock('../../env', () => ({ isMockMode: true }))

function renderConnected() {
  seedSource()
  renderApp()
}

function serveOneAsset() {
  server.use(
    http.get(apiUrl('/assets'), () =>
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
