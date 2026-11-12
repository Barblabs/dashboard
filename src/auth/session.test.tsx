import { act, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { failure } from '../mocks/handlers/responses'
import { apiUrl } from '../mocks/url'
import { renderApp, seedSource } from '../test/render'
import { holdRequests, server } from '../test/server'
import { MOCK_ROLE_KEY, mockTokens, setMockRole } from './mockTokens'
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

function answerMe(answer: () => Response, options: { once?: boolean } = {}) {
  server.use(http.get(apiUrl('/me'), answer, options))
}

// In mock mode the sign-in page offers one button per role.
function findSignInPage() {
  return screen.findByRole('heading', { level: 1, name: 'Test mode' })
}

// A browser that signed in on an earlier visit, opening `path` again.
function reopen(path: string) {
  setMockRole('customer_admin')
  return renderApp(path, null)
}

describe('Restoring the session on startup', () => {
  it('stays on the page that was open, signed in', async () => {
    reopen('/business-context')

    expect(await screen.findByRole('heading', { level: 1, name: 'Business context' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/business-context')
  })

  it('opens the sign-in page when nothing was stored', async () => {
    renderApp('/config', null)

    expect(await findSignInPage()).toBeInTheDocument()
  })

  it('signs out and forgets the tokens the backend rejects', async () => {
    answerMe(() => failure(401, 'unauthorized', 'invalid token'))
    reopen('/config')

    expect(await findSignInPage()).toBeInTheDocument()
    expect(mockTokens.hasStored()).toBe(false)
  })

  it('opens the deactivated page for a deactivated organization', async () => {
    answerMe(() => failure(403, 'customer_deactivated', 'customer deactivated'))
    reopen('/config')

    expect(await screen.findByRole('heading', { level: 1, name: 'Organization deactivated' })).toBeInTheDocument()
  })

  it.each([
    ['the backend is down', () => HttpResponse.error()],
    ['the backend fails', () => failure(503, 'unavailable', 'service unavailable')],
  ])('keeps the tokens when %s, and retrying enters the session', async (_, answer) => {
    answerMe(answer, { once: true })
    const user = reopen('/business-context')

    await screen.findByRole('heading', { level: 1, name: 'Cannot connect to the server' })
    expect(mockTokens.hasStored()).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Business context' })).toBeInTheDocument()
  })
})

describe('Signing in', () => {
  it('opens the deactivated page for a deactivated organization', async () => {
    answerMe(() => failure(403, 'customer_deactivated', 'customer deactivated'))
    const user = renderApp('/login', null)

    await user.click(await screen.findByRole('button', { name: 'Admin (customer_admin)' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Organization deactivated' })).toBeInTheDocument()
  })

  it('tells a user the backend rejects that their account is disabled, and forgets the tokens', async () => {
    answerMe(() => failure(401, 'unauthorized', 'user disabled'))
    const user = renderApp('/login', null)

    await user.click(await screen.findByRole('button', { name: 'Admin (customer_admin)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your account is disabled. Contact your administrator.')
    expect(mockTokens.hasStored()).toBe(false)
  })
})

describe('Returning after signing in', () => {
  it('opens the page that was asked for', async () => {
    const user = renderApp('/business-context?section=1', null)

    await user.click(await screen.findByRole('button', { name: 'Admin (customer_admin)' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Business context' })).toBeInTheDocument()
    expect(`${window.location.pathname}${window.location.search}`).toBe('/business-context?section=1')
  })

  it("opens the role's home when no page was asked for", async () => {
    const user = renderApp('/login', null)

    await user.click(await screen.findByRole('button', { name: 'Admin (customer_admin)' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument()
  })

  it('denies a page the role cannot see', async () => {
    const user = renderApp('/users', null)

    await user.click(await screen.findByRole('button', { name: 'Viewer (viewer)' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Access denied' })).toBeInTheDocument()
  })
})

// What this tab sees when another tab signs out: the tokens gone, and a storage event.
function signOutInAnotherTab() {
  localStorage.removeItem(MOCK_ROLE_KEY)
  window.dispatchEvent(new StorageEvent('storage', { key: MOCK_ROLE_KEY, newValue: null, storageArea: localStorage }))
}

describe('Signing out in another tab', () => {
  it('signs this tab out, and the next user sees none of its data', async () => {
    seedSource()
    const user = renderApp('/config')
    await screen.findByRole('button', { name: 'Sync now' })

    act(signOutInAnotherTab)

    expect(await findSignInPage()).toBeInTheDocument()

    holdRequests('get', '/cmdb/source')
    await user.click(screen.getByRole('button', { name: 'Admin (customer_admin)' }))

    expect(await screen.findByText('Loading configuration…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument()
  })
})

describe('Session', () => {
  it('forgets the stored tokens on signing out, so a reload does not sign back in', async () => {
    const user = renderApp('/config')

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await findSignInPage()).toBeInTheDocument()
    expect(mockTokens.hasStored()).toBe(false)
  })

  it('sends a deactivated user to the deactivated page, and signing out to the sign-in form', async () => {
    seedSource()
    deactivateOnSync()
    const user = renderApp('/config')

    await user.click(await screen.findByRole('button', { name: 'Sync now' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Organization deactivated' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await findSignInPage()).toBeInTheDocument()
  })

  it('shows the next user none of the data the deactivated session loaded', async () => {
    seedSource()
    deactivateOnSync()
    const user = renderApp('/config')
    await user.click(await screen.findByRole('button', { name: 'Sync now' }))
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    await findSignInPage()

    holdRequests('get', '/cmdb/source')
    answerMe(() => HttpResponse.json(NEXT_USER))
    await user.click(screen.getByRole('button', { name: 'Admin (customer_admin)' }))

    expect(await screen.findByText('Loading configuration…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument()
  })

  it('sends a session that is not deactivated away from the deactivated page', async () => {
    renderApp('/deactivated')

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuration' })).toBeInTheDocument()
  })

  it('ignores a deactivation that arrives after signing out', () => {
    act(() => useAuthStore.getState().endSession())

    useAuthStore.getState().deactivate()

    expect(useAuthStore.getState().session).toEqual({ status: 'signedOut' })
  })
})
