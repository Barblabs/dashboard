import { renderApp, seedSource, seedSlackDeliveries, seedSlackInstallation, VIEWER } from '../../test/render'
import { server } from '../../test/server'
import type { AuthUser } from '../../auth/store'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

function renderConnected(user?: AuthUser) {
  seedSource()
  seedSlackInstallation()
  seedSlackDeliveries()
  return renderApp('/config', user)
}

describe('Slack tab', () => {
  it('a viewer can read the installation and failed deliveries', async () => {
    const user = renderConnected(VIEWER)
    await screen.findByText('iTop connected')
    await user.click(screen.getByRole('tab', { name: 'Slack' }))

    // Badge + team in the bar:one of each.
    expect(await screen.findByText('Slack connected')).toBeInTheDocument()
    expect(screen.getAllByText('BARBATTACK Demo').length).toBeGreaterThanOrEqual(1)

    // The failed delivery is listed with its explanation, attempts and raw failure code.
    const delivery = await screen.findByRole('listitem')
    expect(delivery).toHaveTextContent('#security-team')
    expect(delivery).toHaveTextContent('1 attempt ·')
    expect(delivery).toHaveTextContent('The app’s Messages tab is disabled in Slack. Enable it, then retry.')
    expect(delivery).toHaveTextContent('messages_tab_disabled: messages tab disabled in Slack app configuration')

    // The viewer is read-only: no admin actions render.
    expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry all' })).not.toBeInTheDocument()
  })

  it('a customer_admin can retry failed deliveries', async () => {
    const user = renderConnected()
    await screen.findByText('iTop connected')
    await user.click(screen.getByRole('tab', { name: 'Slack' }))

    const retry = await screen.findByRole('button', { name: 'Retry all' })
    expect(screen.getByRole('heading', { name: 'Failed deliveries' })).toBeInTheDocument()
    await user.click(retry)

    expect(await screen.findByText('No failed deliveries.')).toBeInTheDocument()
  })

  it('disconnecting shows the not-connected state without asking for the installation again', async () => {
    let installationReads = 0
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'GET' && new URL(request.url).pathname === '/slack/installation') installationReads++
    })
    const user = renderConnected()
    await screen.findByText('iTop connected')
    await user.click(screen.getByRole('tab', { name: 'Slack' }))

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    await user.click(await screen.findByRole('button', { name: 'Yes, disconnect' }))

    expect(await screen.findByRole('heading', { name: "BARBATTACK isn't delivering to Slack yet" })).toBeInTheDocument()
    expect(installationReads).toBe(1)
  })

  it('says so when the browser blocks the Slack window', async () => {
    vi.stubGlobal('open', () => null)
    seedSource()
    const user = renderApp('/config')
    await screen.findByText('iTop connected')
    await user.click(screen.getByRole('tab', { name: 'Slack' }))

    await user.click(await screen.findByRole('button', { name: 'Connect Slack' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser blocked the Slack window.')
    expect(screen.getByRole('button', { name: 'Connect Slack' })).toBeEnabled()
  })

  it('waits for the Slack window to close before connecting again', async () => {
    const popup = { closed: false }
    vi.stubGlobal('open', () => popup)
    seedSource()
    const user = renderApp('/config')
    await screen.findByText('iTop connected')
    await user.click(screen.getByRole('tab', { name: 'Slack' }))

    await user.click(await screen.findByRole('button', { name: 'Connect Slack' }))

    expect(await screen.findByRole('button', { name: 'Waiting for Slack…' })).toHaveAttribute('aria-disabled', 'true')
    popup.closed = true
    await waitFor(() => expect(screen.getByRole('button', { name: 'Connect Slack' })).toBeEnabled())
  })
})
