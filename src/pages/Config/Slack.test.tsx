import { renderApp, seedSource, seedSlackDeliveries, seedSlackInstallation, VIEWER } from '../../test/render'
import type { AuthUser } from '../../auth/store'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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

    // The row for the failed delivery renders with the raw failure code.
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('row', { name: /#security-team/ })).toBeInTheDocument()
    expect(within(table).getByText('messages_tab_disabled')).toBeInTheDocument()

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
})
