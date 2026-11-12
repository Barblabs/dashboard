import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedUsers } from '../../test/render'
import { server } from '../../test/server'
import { MOCK_USERS } from '../../mocks/users-store'

const ADMIN = MOCK_USERS[0]!
const VIEWER = MOCK_USERS[1]!

async function renderUsers() {
  const user = renderApp('/users')
  await screen.findByText(ADMIN.email)
  return user
}

describe('Users', () => {
  it('shows the list of users with email and role badges', async () => {
    await renderUsers()

    expect(screen.getByText(ADMIN.email)).toBeInTheDocument()
    expect(screen.getByText(VIEWER.email)).toBeInTheDocument()
    const adminRow = screen.getByText(ADMIN.email).closest('tr')!
    const viewerRow = screen.getByText(VIEWER.email).closest('tr')!
    expect(within(adminRow).getByText('Admin')).toBeInTheDocument()
    expect(within(viewerRow).getByText('Viewer')).toBeInTheDocument()
    expect(screen.getByText(/2 users/)).toBeInTheDocument()
  })

  it('shows a counter for a single user in the singular', async () => {
    seedUsers([ADMIN])
    await renderUsers()

    expect(screen.getByText('1 user')).toBeInTheDocument()
  })

  it('shows the counter with disabled count when applicable', async () => {
    const disabled = {
      ...VIEWER,
      id: 'user-disabled',
      email: 'old@acme.example',
      disabled_at: '2026-06-01T00:00:00Z',
    }
    seedUsers([ADMIN, VIEWER, disabled])
    await renderUsers()

    expect(screen.getByText('3 users · 1 disabled')).toBeInTheDocument()
  })

  it('shows a disabled user with no action buttons', async () => {
    const disabled = {
      ...VIEWER,
      id: 'user-disabled',
      email: 'old@acme.example',
      disabled_at: '2026-06-01T00:00:00Z',
    }
    seedUsers([ADMIN, VIEWER, disabled])
    await renderUsers()

    expect(screen.getByText('old@acme.example')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Disable' })).toHaveLength(2)
  })

  it('invites a new user and they appear in the list', async () => {
    const user = await renderUsers()

    await user.click(screen.getByRole('button', { name: 'Invite user' }))
    expect(screen.getByRole('heading', { name: 'Invite user' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'new@acme.example')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    await screen.findByText('new@acme.example')
    expect(screen.queryByRole('heading', { name: 'Invite user' })).not.toBeInTheDocument()
  })

  it('pressing Enter in the email field sends the invitation', async () => {
    const user = await renderUsers()

    await user.click(screen.getByRole('button', { name: 'Invite user' }))
    await user.type(screen.getByLabelText('Email'), 'new@acme.example{Enter}')

    expect(await screen.findByText('new@acme.example')).toBeInTheDocument()
  })

  it('invite fails with email_taken and shows the error', async () => {
    const user = await renderUsers()

    await user.click(screen.getByRole('button', { name: 'Invite user' }))
    await user.type(screen.getByLabelText('Email'), ADMIN.email)
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A user with this email already exists.',
    )
    expect(screen.getByRole('heading', { name: 'Invite user' })).toBeInTheDocument()
  })

  it('reopening the invite dialog after a failed invite shows it clean', async () => {
    const user = await renderUsers()

    await user.click(screen.getByRole('button', { name: 'Invite user' }))
    await user.type(screen.getByLabelText('Email'), ADMIN.email)
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Invite user' }))

    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('changes a user role via the edit modal and the badge updates', async () => {
    const user = await renderUsers()

    const viewerRow = screen.getByText(VIEWER.email).closest('tr')!
    await user.click(within(viewerRow).getByRole('button', { name: 'Edit role' }))

    await user.selectOptions(screen.getByRole('combobox'), 'Admin')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await within(viewerRow).findByText('Admin')).toBeInTheDocument()
  })

  it('role change fails with last_customer_admin and shows the error', async () => {
    seedUsers([ADMIN])
    const user = await renderUsers()

    const adminRow = screen.getByText(ADMIN.email).closest('tr')!
    await user.click(within(adminRow).getByRole('button', { name: 'Edit role' }))

    await user.selectOptions(screen.getByRole('combobox'), 'Viewer')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot remove the last admin of your organization.',
    )
  })

  it('disabling shows confirmation modal and updates the row on confirm', async () => {
    const user = await renderUsers()

    const viewerRow = screen.getByText(VIEWER.email).closest('tr')!
    await user.click(within(viewerRow).getByRole('button', { name: 'Disable' }))

    expect(screen.getByText('This user will no longer be able to sign in. Continue?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Yes, disable' }))

    expect(await screen.findByText('Disabled')).toBeInTheDocument()
    expect(screen.queryByText('This user will no longer be able to sign in. Continue?')).not.toBeInTheDocument()
  })

  it('disable fails with last_customer_admin and shows the error', async () => {
    seedUsers([ADMIN])
    const user = await renderUsers()

    await user.click(screen.getByRole('button', { name: 'Disable' }))
    await user.click(screen.getByRole('button', { name: 'Yes, disable' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot remove the last admin of your organization.',
    )
  })

  it('cancelling the disable modal keeps the user active', async () => {
    const user = await renderUsers()

    const viewerRow = screen.getByText(VIEWER.email).closest('tr')!
    await user.click(within(viewerRow).getByRole('button', { name: 'Disable' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('This user will no longer be able to sign in. Continue?')).not.toBeInTheDocument()
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument()
  })

  it('shows a network error when the user list cannot be loaded', async () => {
    server.use(http.get(apiUrl('/users'), () => HttpResponse.error()))
    renderApp('/users')

    expect(await screen.findByText('Could not reach the server to load the users.')).toBeInTheDocument()
  })
})
