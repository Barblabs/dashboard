import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../../auth/store'
import { i18n } from '../../i18n'
import { mockAreas } from '../../mocks/areas'
import { areasStore } from '../../mocks/areas-store'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedSource } from '../../test/render'
import { holdRequests, server } from '../../test/server'

const VIEWER: AuthUser = {
  id: 'viewer-id',
  email: 'viewer@test.example',
  role: 'viewer',
  customer: { id: 'test-customer-id', name: 'Test Org' },
}

type User = ReturnType<typeof renderApp>

// Records every areas request and lets it fall through to the default handler.
function countAreaRequests() {
  const queries: (string | null)[] = []
  server.use(
    http.get(apiUrl('/areas'), ({ request }) => {
      queries.push(new URL(request.url).searchParams.get('active'))
    }),
  )
  return queries
}

async function renderConnected(user?: AuthUser) {
  seedSource()
  const testUser = renderApp('/config', user)
  await screen.findByText('iTop connected')
  return testUser
}

async function openOwnerDialog(user: User, area: RegExp) {
  const row = await screen.findByRole('row', { name: area })
  await user.click(within(row).getByRole('button', { name: /owner/ }))
  return screen.findByRole('dialog')
}

// The dialog unmounts as soon as a save succeeds, so there is no exit to wait on.
async function dialogClosed() {
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

async function openAreas(user: User) {
  await user.click(screen.getByRole('tab', { name: 'Areas' }))
  return screen.findByRole('table')
}

function areaNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.firstChild?.textContent)
}

describe('Areas', () => {
  it('opens on the tech stack and requests the areas only once their tab opens', async () => {
    const queries = countAreaRequests()
    const user = await renderConnected()

    expect(screen.getByRole('tab', { name: 'Tech stack' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('option', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(queries).toEqual([])

    await openAreas(user)

    expect(queries).toEqual(['true'])
    expect(screen.getByText('2 areas')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Area', 'Owner', 'Status', '',
    ])
    expect(areaNames()).toEqual(['Data Platform', 'Infrastructure'])
    expect(screen.getByRole('row', { name: /Infrastructure/ })).toHaveTextContent(
      'InfrastructureORG-001infra-lead@example.comActive',
    )
    expect(screen.getByRole('row', { name: /Data Platform/ })).toHaveTextContent('No owner')
    expect(screen.queryByRole('row', { name: /Legacy ERP/ })).not.toBeInTheDocument()
  })

  it('the filter reaches inactive areas and says since when, then all of them', async () => {
    const user = await renderConnected()
    await openAreas(user)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Inactive')

    const row = await screen.findByRole('row', { name: /Legacy ERP/ })
    expect(row).toHaveTextContent('Inactive since Sep 1, 2026')
    expect(screen.getByText('1 area')).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Infrastructure/ })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'All')

    await screen.findByText('3 areas')
    expect(areaNames()).toEqual(['Data Platform', 'Infrastructure', 'Legacy ERP'])
  })

  it('says when the CMDB has no areas, apart from a filter matching none', async () => {
    areasStore.save(mockAreas.filter((area) => !area.active))
    const user = await renderConnected()
    await user.click(screen.getByRole('tab', { name: 'Areas' }))

    expect(await screen.findByText('The CMDB has no areas yet.')).toBeInTheDocument()

    areasStore.save([])
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Inactive')

    expect(await screen.findByText('No areas match this filter.')).toBeInTheDocument()
  })

  it('a failed load shows the error, and retrying recovers', async () => {
    server.use(
      http.get(
        apiUrl('/areas'),
        () => HttpResponse.json({ code: 'internal_error', error: 'boom' }, { status: 500 }),
        { once: true },
      ),
    )
    const user = await renderConnected()
    await user.click(screen.getByRole('tab', { name: 'Areas' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The server had an internal error. Try again.')

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('row', { name: /Infrastructure/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a viewer sees the areas without owner actions', async () => {
    const user = await renderConnected(VIEWER)
    await openAreas(user)

    expect(screen.getByRole('row', { name: /Infrastructure/ })).toHaveTextContent(
      'infra-lead@example.com',
    )
    expect(screen.getAllByRole('columnheader')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /owner/ })).not.toBeInTheDocument()
  })

  it('a sync refetches the areas', async () => {
    const user = await renderConnected()
    await openAreas(user)
    expect(screen.queryByRole('row', { name: /Security/ })).not.toBeInTheDocument()

    areasStore.save([
      ...mockAreas,
      { ...mockAreas[0], id: 4, record_id: 'ORG-004', name: 'Security', owner_email: null },
    ])
    await user.click(screen.getByRole('button', { name: 'Sync now' }))

    expect(await screen.findByRole('row', { name: /Security/ })).toBeInTheDocument()
    expect(screen.getByText('3 areas')).toBeInTheDocument()
  })

  it('switching tabs keeps the tech stack filters', async () => {
    const user = await renderConnected()
    await screen.findByRole('option', { name: /prod-api-01/ })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Server')
    await screen.findByText('2 assets')

    await openAreas(user)
    await user.click(screen.getByRole('tab', { name: 'Tech stack' }))

    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('server')
    expect(screen.getByText('2 assets')).toBeInTheDocument()
  })

  it('shows the areas in Spanish', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    seedSource()
    const user = renderApp('/config')
    await user.click(await screen.findByRole('tab', { name: 'Áreas' }))

    const row = await screen.findByRole('row', { name: /Data Platform/ })
    expect(row).toHaveTextContent('Sin dueño')
    expect(row).toHaveTextContent('Activa')
    expect(screen.getByText('2 áreas')).toBeInTheDocument()
  })

  describe('owner', () => {
    it('sets an owner on an area without one', async () => {
      const user = await renderConnected()
      await openAreas(user)
      const row = screen.getByRole('row', { name: /Data Platform/ })
      expect(within(row).getByRole('button', { name: 'Set owner' })).toBeInTheDocument()

      const dialog = await openOwnerDialog(user, /Data Platform/)
      expect(dialog).toHaveAccessibleName('Owner of Data Platform')
      expect(within(dialog).queryByRole('button', { name: 'Remove owner' })).not.toBeInTheDocument()
      await user.type(within(dialog).getByLabelText('Email'), 'data-lead@example.com')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      await dialogClosed()
      const updated = screen.getByRole('row', { name: /Data Platform/ })
      expect(updated).toHaveTextContent('data-lead@example.com')
      expect(within(updated).getByRole('button', { name: 'Edit owner' })).toBeInTheDocument()
    })

    it('changes an owner, then removes it', async () => {
      const user = await renderConnected()
      await openAreas(user)

      let dialog = await openOwnerDialog(user, /Infrastructure/)
      const email = within(dialog).getByLabelText('Email')
      expect(email).toHaveValue('infra-lead@example.com')
      await user.clear(email)
      await user.type(email, 'new-lead@example.com{Enter}')

      await dialogClosed()
      expect(screen.getByRole('row', { name: /Infrastructure/ })).toHaveTextContent(
        'new-lead@example.com',
      )

      dialog = await openOwnerDialog(user, /Infrastructure/)
      await user.click(within(dialog).getByRole('button', { name: 'Remove owner' }))

      await dialogClosed()
      const row = screen.getByRole('row', { name: /Infrastructure/ })
      expect(row).toHaveTextContent('No owner')
      expect(within(row).getByRole('button', { name: 'Set owner' })).toBeInTheDocument()
    })

    it('an invalid email shows the field error and sends nothing', async () => {
      let puts = 0
      server.use(
        http.put(apiUrl('/areas/:id/owner'), () => {
          puts += 1
        }),
      )
      const user = await renderConnected()
      await openAreas(user)

      const dialog = await openOwnerDialog(user, /Data Platform/)
      await user.type(within(dialog).getByLabelText('Email'), 'not-an-email')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(await within(dialog).findByText('Enter a valid email.')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
      expect(puts).toBe(0)
    })

    it('a failed save shows the backend error and keeps the dialog open', async () => {
      server.use(
        http.put(apiUrl('/areas/:id/owner'), () =>
          HttpResponse.json({ code: 'not_found', error: 'area not found' }, { status: 404 }),
        ),
      )
      const user = await renderConnected()
      await openAreas(user)

      const dialog = await openOwnerDialog(user, /Data Platform/)
      await user.type(within(dialog).getByLabelText('Email'), 'data-lead@example.com')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('area not found')
      expect(screen.getByRole('dialog')).toBe(dialog)
      expect(within(dialog).getByLabelText('Email')).toHaveValue('data-lead@example.com')
    })

    it('an owner saved under one filter shows under the others without a refetch', async () => {
      const user = await renderConnected()
      await openAreas(user)
      await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'All')
      await screen.findByText('3 areas')

      const dialog = await openOwnerDialog(user, /Data Platform/)
      await user.type(within(dialog).getByLabelText('Email'), 'data-lead@example.com')
      await user.click(within(dialog).getByRole('button', { name: 'Save' }))
      await dialogClosed()

      const release = holdRequests('get', '/areas')
      await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Active')

      expect(screen.getByText('2 areas')).toBeInTheDocument()
      expect(screen.getByRole('row', { name: /Data Platform/ })).toHaveTextContent(
        'data-lead@example.com',
      )
      release()
    })
  })
})
