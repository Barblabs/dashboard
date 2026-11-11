import { act, screen } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { failure } from '../test/mocks/handlers/responses'
import { apiUrl } from '../test/mocks/url'
import { renderApp, seedSource } from '../test/render'
import { holdRequests, server } from '../test/server'
import { useAuthStore, type AuthUser } from './store'

const NEXT_USER: AuthUser = {
  id: 'next-user-id',
  email: 'next@other.example',
  role: 'customer_admin',
  customer: { id: 'other-customer-id', name: 'Other Org' },
}

function deactivateOnSync() {
  server.use(
    http.post(apiUrl('/cmdb/source/sync'), () => failure(403, 'customer_deactivated', 'customer deactivated')),
  )
}

describe('Session', () => {
  it('sends a deactivated user to the deactivated page, and signing out to the sign-in form', async () => {
    seedSource()
    deactivateOnSync()
    const user = renderApp('/config')

    await user.click(await screen.findByRole('button', { name: 'Sync now' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Organization deactivated' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows the next user none of the data the deactivated session loaded', async () => {
    seedSource()
    deactivateOnSync()
    const user = renderApp('/config')
    await user.click(await screen.findByRole('button', { name: 'Sync now' }))
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    holdRequests('get', '/cmdb/source')
    act(() => useAuthStore.getState().establishSession(NEXT_USER, 'next-token'))

    expect(await screen.findByText('Loading configuration…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument()
  })

  it('sends a session that is not deactivated away from the deactivated page', async () => {
    renderApp('/deactivated')

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument()
  })

  it('ignores a deactivation that arrives after signing out', () => {
    useAuthStore.getState().deactivate()

    expect(useAuthStore.getState().session).toEqual({ status: 'signedOut' })
  })
})
