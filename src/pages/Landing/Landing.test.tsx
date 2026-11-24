import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PLATFORM_ADMIN, renderApp } from '../../test/render'

const TITLE = 'Threat intelligence for the assets in your CMDB'

describe('Landing page', () => {
  it('shows a signed-out visitor the landing page and takes them to sign in', async () => {
    const user = renderApp('/', null)

    expect(await screen.findByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: 'Sign in' })[0])

    expect(await screen.findByRole('heading', { level: 1, name: 'Test mode' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('takes a signed-in Customer Admin to the dashboard', async () => {
    const user = renderApp('/')

    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: 'Open dashboard' })[0])

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/dashboard')
  })

  it('takes a signed-in Platform Admin to the organizations', async () => {
    const user = renderApp('/', PLATFORM_ADMIN)

    await user.click(screen.getAllByRole('link', { name: 'Open dashboard' })[0])

    expect(await screen.findByRole('heading', { level: 1, name: 'Organizations' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/tenants')
  })
})
