import { cleanup, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { i18n } from '../../i18n'
import { apiUrl } from '../../mocks/url'
import { renderApp, seedSource } from '../../test/render'
import { server } from '../../test/server'

type User = ReturnType<typeof renderApp>

const URL_LABEL = 'iTop address (IP or URL)'
const CONFIRM_TEXT =
  'This will disconnect the CMDB. Synced assets are kept, marked as inactive. Continue?'
const VALID_CREDENTIALS = { url: 'http://10.0.0.5:8000', username: 'barb-reader', password: 's3cr3t' }
const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

async function fillForm(
  user: User,
  values: { url?: string; username?: string; password?: string },
) {
  if (values.url !== undefined) {
    const input = screen.getByLabelText(URL_LABEL)
    await user.clear(input)
    await user.type(input, values.url)
  }
  if (values.username !== undefined) {
    const input = screen.getByLabelText('User')
    await user.clear(input)
    await user.type(input, values.username)
  }
  if (values.password !== undefined) {
    await user.type(screen.getByLabelText('Password'), values.password)
  }
}

async function renderConnected() {
  seedSource({ lastSync: TWO_HOURS_AGO })
  const user = renderApp()
  await screen.findByText('iTop connected')
  return user
}

async function openForm() {
  const user = renderApp()
  await user.click(await screen.findByRole('button', { name: 'Select' }))
  return user
}

describe('Configuration', () => {
  it('opens in the connected state when a connection already exists', async () => {
    seedSource()
    renderApp()

    expect(screen.getByText('Loading configuration…')).toBeInTheDocument()
    expect(await screen.findByText('iTop connected')).toBeInTheDocument()
    expect(screen.getByText('http://10.0.0.5:8000')).toBeInTheDocument()
    expect(screen.getByText('barb-reader')).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Choose your CMDB' })).not.toBeInTheDocument()
  })

  it('lists iTop as the only available CMDB and the rest as coming soon', async () => {
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Configuration' })).toBeInTheDocument()
    expect(screen.getByText('Connect your CMDB to load the tech stack.')).toBeInTheDocument()
    expect(screen.getByText('No connection')).toBeInTheDocument()
    expect(screen.getByText('ServiceNow')).toBeInTheDocument()
    expect(screen.getByText('Other CMDB')).toBeInTheDocument()
    expect(screen.getAllByText('Coming soon')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Select' })).toHaveLength(1)
  })

  it('shows the CMDB selection in Spanish', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Elige tu CMDB' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Conectar CMDB' })).toBeInTheDocument()
    expect(screen.getByText('Otra CMDB')).toBeInTheDocument()
    expect(screen.getAllByText('Próximamente')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeInTheDocument()
  })

  it('cancelling an edit returns to the connected source', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))
    expect(screen.getByRole('heading', { name: 'Edit iTop connection' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '← Change CMDB' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('iTop connected')).toBeInTheDocument()
  })

  it('editing replaces the login without connecting or syncing again', async () => {
    const requests: string[] = []
    server.use(
      http.put(apiUrl('/cmdb/source'), () => {
        requests.push('update')
      }),
      http.post(apiUrl('/cmdb/source'), () => {
        requests.push('connect')
      }),
      http.post(apiUrl('/cmdb/source/sync'), () => {
        requests.push('sync')
      }),
    )
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))
    await fillForm(user, { username: 'barb-rotated', password: 'n3w' })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('iTop connected')).toBeInTheDocument()
    expect(screen.getByText('barb-rotated')).toBeInTheDocument()
    expect(screen.getByText('Last sync: 2 hr. ago')).toBeInTheDocument()
    expect(requests).toEqual(['update'])
  })

  it('a rejected edit shows the translated failure and keeps the form open', async () => {
    server.use(
      http.put(apiUrl('/cmdb/source'), () =>
        HttpResponse.json({ code: 'invalid_credentials', error: 'login rejected' }, { status: 422 }),
      ),
    )
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))
    await fillForm(user, { password: 'wrong' })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('✗ iTop rejected the user or the password.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit iTop connection' })).toBeInTheDocument()
  })

  it('connects for the first time: picks iTop, tests, connects and shows the inventory', async () => {
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(screen.getByRole('button', { name: 'Testing…' })).toHaveAttribute('aria-disabled', 'true')
    expect(
      await screen.findByText('✓ Connection successful. You can continue with the sync.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))
    expect(screen.getByRole('button', { name: 'Connecting…' })).toHaveAttribute('aria-disabled', 'true')

    expect(await screen.findByText('iTop connected')).toBeInTheDocument()
    expect(screen.getByText('http://10.0.0.5:8000')).toBeInTheDocument()
    expect(screen.getByText('barb-reader')).toBeInTheDocument()
    expect(
      screen.getByText('Last sync: less than a minute ago'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(6)
  })

  it('manual sync updates the last sync time', async () => {
    const user = await renderConnected()
    expect(screen.getByText('Last sync: 2 hr. ago')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(screen.getByRole('button', { name: 'Syncing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit connection' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeDisabled()

    expect(
      await screen.findByText('Last sync: less than a minute ago'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeEnabled()
  })

  it('syncing updates the time without refetching the connection', async () => {
    let connectionRequests = 0
    server.use(
      http.get(apiUrl('/cmdb/source'), () => {
        connectionRequests += 1
      }),
    )
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Sync now' }))

    expect(await screen.findByText('Last sync: less than a minute ago')).toBeInTheDocument()
    expect(connectionRequests).toBe(1)
  })

  it('shows the connection bar and relative time in Spanish', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    seedSource({ lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString() })
    const user = renderApp()

    expect(await screen.findByText('iTop conectado')).toBeInTheDocument()
    expect(screen.getByText('Última sincronización: hace 5 min')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar conexión' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sincronizar ahora' }))
    expect(screen.getByRole('button', { name: 'Sincronizando…' })).toBeDisabled()
    expect(
      await screen.findByText('Última sincronización: hace menos de un minuto'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Desconectar' }))
    expect(
      screen.getByText(
        'Esta acción desconectará el CMDB. Los activos sincronizados se conservan, marcados como inactivos. ¿Continuar?',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí, desconectar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('cancelling the disconnect keeps the connection', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(screen.getByText(CONFIRM_TEXT)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(CONFIRM_TEXT)).not.toBeInTheDocument()
    expect(screen.getByText('iTop connected')).toBeInTheDocument()
  })

  it('confirming the disconnect returns to the CMDB list and does not come back on reload', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))
    await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))

    expect(await screen.findByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
    expect(screen.queryByText('iTop connected')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    cleanup()
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
  })

  it('disconnecting after editing the connection returns to the CMDB list', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))
    await fillForm(user, { password: 's3cr3t' })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))

    expect(await screen.findByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
  })

  it('testing with the admin user fails with the REST profile message', async () => {
    const user = await openForm()
    await fillForm(user, { ...VALID_CREDENTIALS, username: 'admin' })

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(
      await screen.findByText(
        "✗ The user 'admin' does not have the 'REST Services User' profile in iTop. Create a dedicated user with that profile.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Test connection' })).toBeEnabled()
  })

  it.each([
    ['an unknown code', { code: 'certificate_expired' }],
    ['no code', {}],
  ])('a failed test with %s shows the backend message', async (_, extra) => {
    server.use(
      http.post(apiUrl('/cmdb/source/test'), () =>
        HttpResponse.json({ ok: false, error: 'The iTop certificate expired.', ...extra }),
      ),
    )
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(await screen.findByText('✗ The iTop certificate expired.')).toBeInTheDocument()
  })

  it('shows the form, validation and REST profile error in Spanish', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    const user = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Seleccionar' }))

    expect(screen.getByRole('heading', { name: 'Conectar iTop' })).toBeInTheDocument()
    await user.click(screen.getByLabelText('Dirección de iTop (IP o URL)'))
    await user.tab()
    expect(screen.getByText('La dirección es obligatoria.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Dirección de iTop (IP o URL)'), 'http://10.0.0.5:8000')
    await user.type(screen.getByLabelText('Usuario'), 'admin')
    await user.type(screen.getByLabelText('Contraseña'), 's3cr3t')
    await user.click(screen.getByRole('button', { name: 'Probar conexión' }))

    expect(
      await screen.findByText(
        "✗ El usuario 'admin' no tiene el perfil 'REST Services User' en iTop. Crea un usuario dedicado con ese perfil.",
      ),
    ).toBeInTheDocument()
  })

  it('connecting shows the connected state without refetching the connection', async () => {
    let connectionRequests = 0
    server.use(
      http.get(apiUrl('/cmdb/source'), () => {
        connectionRequests += 1
      }),
    )
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))

    expect(await screen.findByText('iTop connected')).toBeInTheDocument()
    expect(connectionRequests).toBe(1)
  })

  it('validates fields on the client and clears errors while typing', async () => {
    const user = await openForm()
    const url = screen.getByLabelText(URL_LABEL)
    const username = screen.getByLabelText('User')

    expect(screen.getByRole('button', { name: 'Test connection' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Connect and sync' })).toBeDisabled()

    await user.click(url)
    await user.click(username)
    await user.tab()
    expect(screen.getByText('The address is required.')).toBeInTheDocument()
    expect(screen.getByText('The user is required.')).toBeInTheDocument()
    expect(screen.queryByText('Include the port if it is not 80 or 443.')).not.toBeInTheDocument()

    await user.type(url, '10.0.0.5')
    expect(screen.queryByText('The address is required.')).not.toBeInTheDocument()
    expect(screen.getByText('Include the port if it is not 80 or 443.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Password'), 's3cr3t')
    await user.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(screen.getByText('Must start with http:// or https://')).toBeInTheDocument()
    expect(screen.getByText('The user is required.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Testing…' })).not.toBeInTheDocument()

    await user.type(username, 'b')
    expect(screen.queryByText('The user is required.')).not.toBeInTheDocument()
    expect(
      screen.getByText('User with the REST Services User profile and read-only permissions.'),
    ).toBeInTheDocument()
  })

  it('editing the connection prefills the address and user, but not the password', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))

    expect(screen.getByLabelText(URL_LABEL)).toHaveValue('http://10.0.0.5:8000')
    expect(screen.getByLabelText('User')).toHaveValue('barb-reader')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('shows a network error when the test does not reach the backend', async () => {
    server.use(http.post(apiUrl('/cmdb/source/test'), () => HttpResponse.error()))
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(await screen.findByText('✗ Network error while testing the connection.')).toBeInTheDocument()
  })

  it('an HTTP error while testing is not shown as a network error', async () => {
    server.use(http.post(apiUrl('/cmdb/source/test'), () => new HttpResponse(null, { status: 500 })))
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(await screen.findByText('✗ Could not connect to iTop.')).toBeInTheDocument()
  })

  it('shows an error when the connection cannot be saved', async () => {
    server.use(http.post(apiUrl('/cmdb/source'), () => HttpResponse.error()))
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))

    expect(await screen.findByText('✗ Could not save the connection.')).toBeInTheDocument()
    expect(screen.queryByText('iTop connected')).not.toBeInTheDocument()
  })

  it('shows the inventory with translated headers and labels', async () => {
    await renderConnected()

    expect(screen.getByText('Loading inventory…')).toBeInTheDocument()
    const inactiveRow = await screen.findByRole('row', { name: /erp-app-02/ })
    expect(screen.getByRole('heading', { name: 'Tech stack' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Component', 'Type', 'Operating system', 'Criticality', 'Owner', 'Status',
    ])
    expect(screen.getByRole('row', { name: /prod-api-01/ })).toHaveTextContent(
      'prod-api-01SRV-001ServerUbuntu 22.04Highdevops@example.comActive',
    )
    expect(inactiveRow).toHaveTextContent('Virtual Machine')
    expect(inactiveRow).toHaveTextContent('Unknown')
    expect(inactiveRow).toHaveTextContent('Inactive')
  })

  it('shows the inventory in Spanish', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    seedSource({ lastSync: TWO_HOURS_AGO })
    renderApp()

    expect(await screen.findByText('Cargando inventario…')).toBeInTheDocument()
    const inactiveRow = await screen.findByRole('row', { name: /erp-app-02/ })
    expect(screen.getByRole('heading', { name: 'Stack tecnológico' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Componente', 'Tipo', 'Sistema operativo', 'Criticidad', 'Dueño', 'Estado',
    ])
    expect(screen.getByRole('row', { name: /prod-api-01/ })).toHaveTextContent(
      'prod-api-01SRV-001ServidorUbuntu 22.04Altadevops@example.comActivo',
    )
    expect(inactiveRow).toHaveTextContent('Máquina virtual')
    expect(inactiveRow).toHaveTextContent('Desconocida')
    expect(inactiveRow).toHaveTextContent('Inactivo')
  })

  it('does not fetch the inventory while there is no connection', async () => {
    let assetRequests = 0
    server.use(
      http.get(apiUrl('/assets'), () => {
        assetRequests += 1
      }),
    )
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
    expect(assetRequests).toBe(0)
  })

  it('shows the empty state right away when the inventory cannot be read', async () => {
    server.use(http.get(apiUrl('/assets'), () => new HttpResponse(null, { status: 500 })))
    await renderConnected()

    expect(
      await screen.findByText('There are no assets in the inventory.', {}, { timeout: 1000 }),
    ).toBeInTheDocument()
  })

  it('shows the empty state when the inventory has no assets', async () => {
    server.use(http.get(apiUrl('/assets'), () => HttpResponse.json({ assets: [] })))
    await renderConnected()

    expect(
      await screen.findByText('There are no assets in the inventory.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('sends the provider with the login when testing and connecting', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post(apiUrl('/cmdb/source/test'), async ({ request }) => {
        bodies.push(await request.clone().json())
      }),
      http.post(apiUrl('/cmdb/source'), async ({ request }) => {
        bodies.push(await request.clone().json())
      }),
    )
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Test connection' }))
    await screen.findByText(/Connection successful/)
    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))
    await screen.findByText('iTop connected')

    const login = { provider: 'itop', url: 'http://10.0.0.5:8000', user: 'barb-reader', password: 's3cr3t' }
    expect(bodies).toEqual([login, login])
  })

  it('a failed first sync still connects and shows the failure', async () => {
    server.use(
      http.post(apiUrl('/cmdb/source'), () =>
        HttpResponse.json({
          provider: 'itop',
          url: 'http://10.0.0.5:8000',
          user: 'barb-reader',
          lastSync: null,
          lastSyncFailure: { at: new Date().toISOString(), error: 'iTop timed out' },
        }),
      ),
    )
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))

    expect(await screen.findByText('iTop connected')).toBeInTheDocument()
    expect(screen.getByText('Last sync: never')).toBeInTheDocument()
    expect(
      screen.getByText('Last sync failed less than a minute ago: iTop timed out'),
    ).toBeInTheDocument()
  })

  it.each([
    ['a known code is translated', 'unreachable', 'Could not reach iTop. Check the address, the port and the network.'],
    ['an unknown code shows the backend message', 'certificate_expired', 'The iTop certificate expired.'],
  ])('a rejected connect: %s', async (_, code, text) => {
    server.use(
      http.post(apiUrl('/cmdb/source'), () =>
        HttpResponse.json({ code, error: 'The iTop certificate expired.' }, { status: 422 }),
      ),
    )
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))

    expect(await screen.findByText(`✗ ${text}`)).toBeInTheDocument()
    expect(screen.queryByText('iTop connected')).not.toBeInTheDocument()
  })

  it('a sync rejected for its credentials offers to update them', async () => {
    server.use(
      http.post(apiUrl('/cmdb/source/sync'), () =>
        HttpResponse.json({ code: 'invalid_credentials', error: 'login rejected' }, { status: 502 }),
      ),
    )
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Sync now' }))

    expect(await screen.findByText('iTop rejected the user or the password.')).toBeInTheDocument()
    expect(screen.getByText('Last sync: 2 hr. ago')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Update credentials' }))
    expect(screen.getByRole('heading', { name: 'Edit iTop connection' })).toBeInTheDocument()
  })

  it('a sync that fails for another reason does not offer to update the credentials', async () => {
    server.use(
      http.post(apiUrl('/cmdb/source/sync'), () =>
        HttpResponse.json({ code: 'sync_in_progress', error: 'sync running' }, { status: 409 }),
      ),
    )
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Sync now' }))

    expect(
      await screen.findByText('A sync is already running. Try again in a moment.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update credentials' })).not.toBeInTheDocument()
  })

  it('shows the failure recorded on the latest sync', async () => {
    seedSource({
      lastSync: TWO_HOURS_AGO,
      lastSyncFailure: { at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), error: 'iTop timed out' },
    })
    renderApp()

    expect(
      await screen.findByText('Last sync failed 5 min. ago: iTop timed out'),
    ).toBeInTheDocument()
  })

  it('a disconnect refused while a sync commits shows why and keeps the source', async () => {
    server.use(
      http.delete(apiUrl('/cmdb/source'), () =>
        HttpResponse.json({ code: 'sync_in_progress', error: 'sync running' }, { status: 409 }),
      ),
    )
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))
    await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))

    expect(
      await screen.findByText('A sync is already running. Try again in a moment.'),
    ).toBeInTheDocument()
    expect(screen.getByText('iTop connected')).toBeInTheDocument()
  })

  it('a token-auth source shows no user and edits with an empty one', async () => {
    seedSource({ lastSync: TWO_HOURS_AGO, user: null })
    const user = renderApp()

    expect(await screen.findByText('iTop connected')).toBeInTheDocument()
    expect(screen.queryByText('barb-reader')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))
    expect(screen.getByLabelText('User')).toHaveValue('')
  })
})
