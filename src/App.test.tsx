import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './test/render'

function nav() {
  return within(screen.getByRole('navigation'))
}

describe('Navigation', () => {
  it('opens the configuration page by default', async () => {
    renderApp()

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/config')
    expect(nav().getByRole('link', { name: 'Configuration' })).toHaveAttribute('aria-current', 'page')
  })

  it('switches pages from the sidebar', async () => {
    const user = renderApp()

    await user.click(nav().getByRole('link', { name: 'Findings' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Findings' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/findings')
    expect(nav().getByRole('link', { name: 'Findings' })).toHaveAttribute('aria-current', 'page')
    expect(nav().getByRole('link', { name: 'Configuration' })).not.toHaveAttribute('aria-current')
  })

  it('opens a page from its URL', () => {
    renderApp('/notifications')

    expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument()
  })

  it('shows the not found page for unknown URLs', async () => {
    const user = renderApp('/does-not-exist')

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/does-not-exist')

    await user.click(screen.getByRole('link', { name: 'Back to home' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument()
  })

  it('shows the forbidden page', () => {
    renderApp('/forbidden')

    expect(screen.getByRole('heading', { level: 1, name: 'Access denied' })).toBeInTheDocument()
  })
})
