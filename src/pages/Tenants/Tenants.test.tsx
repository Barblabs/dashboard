import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '../../mocks/url'
import { PLATFORM_ADMIN, renderApp, seedCustomers } from '../../test/render'
import { server } from '../../test/server'
import { MOCK_CUSTOMERS } from '../../mocks/customers-store'

const ORG_A = MOCK_CUSTOMERS[0]!
const ORG_B = MOCK_CUSTOMERS[1]!
const ORG_C = MOCK_CUSTOMERS[2]!

async function renderTenants() {
  const user = renderApp('/tenants', PLATFORM_ADMIN)
  await screen.findByText(ORG_A.name)
  return user
}

describe('Tenants', () => {
  it('shows the grid of organizations with name and status', async () => {
    await renderTenants()

    expect(screen.getByText(ORG_A.name)).toBeInTheDocument()
    expect(screen.getByText(ORG_B.name)).toBeInTheDocument()
    expect(screen.getByText(ORG_C.name)).toBeInTheDocument()
    expect(screen.getAllByText('Active')).toHaveLength(2)
    expect(screen.getByText(/Deactivated/)).toBeInTheDocument()
  })

  it('shows the counter with total and deactivated count', async () => {
    await renderTenants()
    expect(screen.getByText(/3 organizations · 1 deactivated/)).toBeInTheDocument()
  })

  it('filters organizations by name', async () => {
    const user = await renderTenants()

    await user.type(screen.getByPlaceholderText('Search by name…'), 'Acme')

    expect(screen.getByText(ORG_A.name)).toBeInTheDocument()
    expect(screen.queryByText(ORG_B.name)).not.toBeInTheDocument()
    expect(screen.queryByText(ORG_C.name)).not.toBeInTheDocument()
  })

  it('creates a new organization via two-step modal', async () => {
    const user = await renderTenants()

    await user.click(screen.getByRole('button', { name: 'New organization' }))
    expect(screen.getByRole('heading', { name: 'New organization' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Organization name'), 'Delta Inc')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Admin email' }), 'admin@delta.example')
    await user.click(screen.getByRole('button', { name: 'Create and send invitation' }))

    await screen.findByText('Delta Inc')
    expect(screen.queryByRole('heading', { name: 'New organization' })).not.toBeInTheDocument()
  })

  it('create fails with customer_name_taken and shows the error', async () => {
    const user = await renderTenants()

    await user.click(screen.getByRole('button', { name: 'New organization' }))
    await user.type(screen.getByLabelText('Organization name'), ORG_A.name)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.type(screen.getByRole('textbox', { name: 'Admin email' }), 'admin@delta.example')
    await user.click(screen.getByRole('button', { name: 'Create and send invitation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An organization with this name already exists.',
    )
    expect(screen.getByRole('heading', { name: 'Admin email' })).toBeInTheDocument()
  })

  it('renames an organization and the card updates', async () => {
    const user = await renderTenants()

    const cards = screen.getAllByTestId('customer-card')
    const acmeCard = cards.find((c) => within(c).queryByText(ORG_A.name))!
    await user.click(within(acmeCard).getByRole('button', { name: 'Rename' }))

    expect(screen.getByRole('heading', { name: 'Rename organization' })).toBeInTheDocument()
    const nameInput = screen.getByLabelText('Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Acme Renamed')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByText('Acme Renamed')
    expect(screen.queryByText(ORG_A.name)).not.toBeInTheDocument()
  })

  it('rename fails with customer_name_taken and shows the error', async () => {
    const user = await renderTenants()

    const cards = screen.getAllByTestId('customer-card')
    const acmeCard = cards.find((c) => within(c).queryByText(ORG_A.name))!
    await user.click(within(acmeCard).getByRole('button', { name: 'Rename' }))

    const nameInput = screen.getByLabelText('Name')
    await user.clear(nameInput)
    await user.type(nameInput, ORG_B.name)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An organization with this name already exists.',
    )
  })

  it('deactivating shows confirmation modal and updates the card', async () => {
    const user = await renderTenants()

    const cards = screen.getAllByTestId('customer-card')
    const acmeCard = cards.find((c) => within(c).queryByText(ORG_A.name))!
    await user.click(within(acmeCard).getByRole('button', { name: 'Deactivate' }))

    expect(screen.getByText('Users of this organization will no longer be able to sign in.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes, deactivate' }))

    expect(await within(acmeCard).findByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
    expect(screen.queryByText('Users of this organization will no longer be able to sign in.')).not.toBeInTheDocument()
  })

  it('reactivating works without confirmation and updates the card', async () => {
    seedCustomers([{ ...ORG_A, deactivated_at: '2026-10-01T00:00:00Z' }, ORG_B])
    const user = await renderTenants()

    const cards = screen.getAllByTestId('customer-card')
    const acmeCard = cards.find((c) => within(c).queryByText(ORG_A.name))!
    await user.click(within(acmeCard).getByRole('button', { name: 'Reactivate' }))

    expect(await within(acmeCard).findByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
  })

  it('shows a network error when the organization list cannot be loaded', async () => {
    server.use(http.get(apiUrl('/customers'), () => HttpResponse.error()))
    renderApp('/tenants', PLATFORM_ADMIN)

    expect(await screen.findByText('Could not reach the server to load the organizations.')).toBeInTheDocument()
  })
})
