import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { App } from '../../App'
import { i18n } from '../../i18n'
import { saveConnection } from '../../mocks/handlers'
import { server } from '../../test/server'

const API = import.meta.env.VITE_API_URL as string

type User = ReturnType<typeof userEvent.setup>

const URL_LABEL = 'iTop address (IP or URL)'
const CONFIRM_TEXT =
  'This will disconnect the CMDB and delete the saved configuration. Continue?'
const VALID_CREDENTIALS = { url: 'http://10.0.0.5:8000', username: 'barb-reader', password: 's3cr3t' }
const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

function saveExistingConnection(lastSync: string) {
  saveConnection({ provider: 'itop', url: 'http://10.0.0.5:8000', user: 'barb-reader', lastSync })
}

function renderApp() {
  const user = userEvent.setup()
  render(<App />)
  return user
}

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
  saveExistingConnection(TWO_HOURS_AGO)
  const user = renderApp()
  await screen.findByText('iTop connected')
  return user
}

async function openForm() {
  const user = renderApp()
  await user.click(await screen.findByRole('button', { name: 'Select' }))
  return user
}

describe('Configuración', () => {
  it('abre en estado conectado cuando ya existe una conexión', async () => {
    saveExistingConnection(new Date().toISOString())
    renderApp()

    expect(screen.getByText('Loading configuration…')).toBeInTheDocument()
    expect(await screen.findByText('iTop connected')).toBeInTheDocument()
    expect(screen.getByText('http://10.0.0.5:8000')).toBeInTheDocument()
    expect(screen.getByText('barb-reader')).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Choose your CMDB' })).not.toBeInTheDocument()
  })

  it('lista iTop como única CMDB disponible y las demás como próximamente', async () => {
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Configuration' })).toBeInTheDocument()
    expect(screen.getByText('Connect your CMDB to load the tech stack.')).toBeInTheDocument()
    expect(screen.getByText('No connection')).toBeInTheDocument()
    expect(screen.getByText('ServiceNow')).toBeInTheDocument()
    expect(screen.getByText('Other CMDB')).toBeInTheDocument()
    expect(screen.getAllByText('Coming soon')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Select' })).toHaveLength(1)
  })

  it('muestra la selección de CMDB en español', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Elige tu CMDB' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Conectar CMDB' })).toBeInTheDocument()
    expect(screen.getByText('Otra CMDB')).toBeInTheDocument()
    expect(screen.getAllByText('Próximamente')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeInTheDocument()
  })

  it('volver desde la edición lleva a la lista de CMDB con el formulario vacío', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))
    await user.click(screen.getByRole('button', { name: '← Change CMDB' }))

    expect(screen.getByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
    expect(screen.queryByText('iTop connected')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select' }))
    expect(screen.getByLabelText(URL_LABEL)).toHaveValue('')
    expect(screen.getByLabelText('User')).toHaveValue('')
  })

  it('conecta por primera vez: elige iTop, prueba, conecta y muestra el inventario', async () => {
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

  it('la sincronización manual actualiza la hora de la última sincronización', async () => {
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

  it('sincronizar actualiza la hora sin volver a pedir la conexión', async () => {
    let connectionRequests = 0
    server.use(
      http.get(`${API}/cmdb/connection`, () => {
        connectionRequests += 1
      }),
    )
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Sync now' }))

    expect(await screen.findByText('Last sync: less than a minute ago')).toBeInTheDocument()
    expect(connectionRequests).toBe(1)
  })

  it('muestra la barra de conexión y la hora relativa en español', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    saveExistingConnection(new Date(Date.now() - 5 * 60 * 1000).toISOString())
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
        'Esta acción desconectará el CMDB y eliminará la configuración guardada. ¿Continuar?',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí, desconectar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('cancelar la desconexión conserva la conexión', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(screen.getByText(CONFIRM_TEXT)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(CONFIRM_TEXT)).not.toBeInTheDocument()
    expect(screen.getByText('iTop connected')).toBeInTheDocument()
  })

  it('confirmar la desconexión vuelve a la lista de CMDB y no reaparece al recargar', async () => {
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

  it('desconectar después de editar la conexión vuelve a la lista de CMDB', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))
    await fillForm(user, { password: 's3cr3t' })
    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))
    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))

    expect(await screen.findByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
  })

  it('la prueba con el usuario admin falla con el mensaje del perfil REST', async () => {
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
    ['un código desconocido', { code: 'certificate_expired' }],
    ['ningún código', {}],
  ])('una prueba fallida con %s muestra el mensaje del backend', async (_, extra) => {
    server.use(
      http.post(`${API}/cmdb/test`, () =>
        HttpResponse.json({ ok: false, error: 'El certificado de iTop expiró.', ...extra }),
      ),
    )
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(await screen.findByText('✗ El certificado de iTop expiró.')).toBeInTheDocument()
  })

  it('muestra el formulario, la validación y el error de perfil REST en español', async () => {
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

  it('conectar muestra el estado conectado sin volver a pedir la conexión', async () => {
    let connectionRequests = 0
    server.use(
      http.get(`${API}/cmdb/connection`, () => {
        connectionRequests += 1
      }),
    )
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))

    expect(await screen.findByText('iTop connected')).toBeInTheDocument()
    expect(connectionRequests).toBe(1)
  })

  it('valida los campos en el cliente y limpia los errores al escribir', async () => {
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

  it('editar la conexión precarga la dirección y el usuario, pero no la contraseña', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Edit connection' }))

    expect(screen.getByLabelText(URL_LABEL)).toHaveValue('http://10.0.0.5:8000')
    expect(screen.getByLabelText('User')).toHaveValue('barb-reader')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Connect and sync' })).toBeDisabled()
  })

  it('muestra un error de red cuando la prueba no llega al backend', async () => {
    server.use(http.post(`${API}/cmdb/test`, () => HttpResponse.error()))
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(await screen.findByText('✗ Network error while testing the connection.')).toBeInTheDocument()
  })

  it('un error HTTP al probar no se presenta como error de red', async () => {
    server.use(http.post(`${API}/cmdb/test`, () => new HttpResponse(null, { status: 500 })))
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(await screen.findByText('✗ Could not connect to iTop.')).toBeInTheDocument()
  })

  it('muestra un error cuando no se puede guardar la conexión', async () => {
    server.use(http.post(`${API}/cmdb/connect`, () => HttpResponse.error()))
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Connect and sync' }))

    expect(await screen.findByText('✗ Could not save the connection.')).toBeInTheDocument()
    expect(screen.queryByText('iTop connected')).not.toBeInTheDocument()
  })

  it('muestra el inventario con encabezados y etiquetas traducidas', async () => {
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

  it('muestra el inventario en español', async () => {
    localStorage.setItem('language', 'es')
    await i18n.changeLanguage()
    saveExistingConnection(TWO_HOURS_AGO)
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

  it('no pide el inventario mientras no hay conexión', async () => {
    let assetRequests = 0
    server.use(
      http.get(`${API}/assets`, () => {
        assetRequests += 1
      }),
    )
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
    expect(assetRequests).toBe(0)
  })

  it('muestra el estado vacío de inmediato cuando no se puede leer el inventario', async () => {
    server.use(http.get(`${API}/assets`, () => new HttpResponse(null, { status: 500 })))
    await renderConnected()

    expect(
      await screen.findByText('There are no assets in the inventory.', {}, { timeout: 1000 }),
    ).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando el inventario no tiene activos', async () => {
    server.use(http.get(`${API}/assets`, () => HttpResponse.json({ assets: [] })))
    await renderConnected()

    expect(
      await screen.findByText('There are no assets in the inventory.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
