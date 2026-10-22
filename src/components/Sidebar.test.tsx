import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { i18n } from '../i18n'

// Simulates opening the app with a different browser language: the detector runs again.
async function openWithBrowserLanguages(languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(languages[0])
  await i18n.changeLanguage()
  render(<App />)
}

// The page repeats "Configuración" in its title: assertions are scoped to the navigation.
function nav() {
  return within(screen.getByRole('navigation'))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Language', () => {
  it('shows English for a non-Spanish browser locale', async () => {
    await openWithBrowserLanguages(['fr-FR'])

    expect(nav().getByText('Configuration')).toBeInTheDocument()
    expect(nav().getByText('Findings')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it.each(['es', 'es-MX', 'es-ES'])('shows Spanish for the %s browser locale', async (locale) => {
    await openWithBrowserLanguages([locale])

    expect(nav().getByText('Configuración')).toBeInTheDocument()
    expect(nav().getByText('Hallazgos')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })

  it('switches language immediately from the sidebar', async () => {
    const user = userEvent.setup()
    await openWithBrowserLanguages(['en-US'])

    await user.click(screen.getByRole('button', { name: 'ES' }))

    expect(nav().getByText('Configuración')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.lang).toBe('es')

    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(nav().getByText('Configuration')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it('keeps the chosen language across reloads, over the browser locale', async () => {
    const user = userEvent.setup()
    await openWithBrowserLanguages(['en-US'])
    await user.click(screen.getByRole('button', { name: 'ES' }))

    cleanup()
    await openWithBrowserLanguages(['en-US'])

    expect(nav().getByText('Configuración')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
  })
})
