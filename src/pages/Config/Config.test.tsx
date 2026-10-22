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

const URL_LABEL = 'Dirección de iTop (IP o URL)'
const CONFIRM_TEXT =
  'Esta acción desconectará el CMDB y eliminará la configuración guardada. ¿Continuar?'
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
    const input = screen.getByLabelText('Usuario')
    await user.clear(input)
    await user.type(input, values.username)
  }
  if (values.password !== undefined) {
    await user.type(screen.getByLabelText('Contraseña'), values.password)
  }
}

async function renderConnected() {
  saveExistingConnection(TWO_HOURS_AGO)
  const user = renderApp()
  await screen.findByText('iTop conectado')
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
    expect(await screen.findByText('iTop conectado')).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Editar conexión' }))
    await user.click(screen.getByRole('button', { name: '← Cambiar CMDB' }))

    expect(screen.getByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
    expect(screen.queryByText('iTop conectado')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select' }))
    expect(screen.getByLabelText(URL_LABEL)).toHaveValue('')
    expect(screen.getByLabelText('Usuario')).toHaveValue('')
  })

  it('conecta por primera vez: elige iTop, prueba, conecta y muestra el inventario', async () => {
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Probar conexión' }))
    expect(screen.getByRole('button', { name: 'Probando…' })).toBeDisabled()
    expect(
      await screen.findByText('✓ Conexión exitosa. Puedes continuar con la sincronización.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Conectar y sincronizar' }))
    expect(screen.getByRole('button', { name: 'Conectando…' })).toBeDisabled()

    expect(await screen.findByText('iTop conectado')).toBeInTheDocument()
    expect(screen.getByText('http://10.0.0.5:8000')).toBeInTheDocument()
    expect(screen.getByText('barb-reader')).toBeInTheDocument()
    expect(
      screen.getByText('Última sincronización: hace menos de un minuto'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: /prod-api-01/ })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(6)
  })

  it('la sincronización manual actualiza la hora de la última sincronización', async () => {
    const user = await renderConnected()
    expect(screen.getByText('Última sincronización: hace 2 h')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sincronizar ahora' }))
    expect(screen.getByRole('button', { name: 'Sincronizando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Editar conexión' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Desconectar' })).toBeDisabled()

    expect(
      await screen.findByText('Última sincronización: hace menos de un minuto'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sincronizar ahora' })).toBeEnabled()
  })

  it('cancelar la desconexión conserva la conexión', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Desconectar' }))
    expect(screen.getByText(CONFIRM_TEXT)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText(CONFIRM_TEXT)).not.toBeInTheDocument()
    expect(screen.getByText('iTop conectado')).toBeInTheDocument()
  })

  it('confirmar la desconexión vuelve a la lista de CMDB y no reaparece al recargar', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Desconectar' }))
    await user.click(screen.getByRole('button', { name: 'Sí, desconectar' }))

    expect(await screen.findByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
    expect(screen.queryByText('iTop conectado')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    cleanup()
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Choose your CMDB' })).toBeInTheDocument()
  })

  it('la prueba con el usuario admin falla con el mensaje del perfil REST', async () => {
    const user = await openForm()
    await fillForm(user, { ...VALID_CREDENTIALS, username: 'admin' })

    await user.click(screen.getByRole('button', { name: 'Probar conexión' }))

    expect(
      await screen.findByText(
        "✗ El usuario 'admin' no tiene el perfil 'REST Services User' en iTop. Crea un usuario dedicado con ese perfil.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Probar conexión' })).toBeEnabled()
  })

  it('valida los campos en el cliente y limpia los errores al escribir', async () => {
    const user = await openForm()
    const url = screen.getByLabelText(URL_LABEL)
    const username = screen.getByLabelText('Usuario')

    expect(screen.getByRole('button', { name: 'Probar conexión' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Conectar y sincronizar' })).toBeDisabled()

    await user.click(url)
    await user.click(username)
    await user.tab()
    expect(screen.getByText('La dirección es obligatoria.')).toBeInTheDocument()
    expect(screen.getByText('El usuario es obligatorio.')).toBeInTheDocument()
    expect(screen.queryByText('Incluye el puerto si no es el 80 o el 443.')).not.toBeInTheDocument()

    await user.type(url, '10.0.0.5')
    expect(screen.queryByText('La dirección es obligatoria.')).not.toBeInTheDocument()
    expect(screen.getByText('Incluye el puerto si no es el 80 o el 443.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Contraseña'), 's3cr3t')
    await user.click(screen.getByRole('button', { name: 'Probar conexión' }))
    expect(screen.getByText('Debe comenzar con http:// o https://')).toBeInTheDocument()
    expect(screen.getByText('El usuario es obligatorio.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Probando…' })).not.toBeInTheDocument()

    await user.type(username, 'b')
    expect(screen.queryByText('El usuario es obligatorio.')).not.toBeInTheDocument()
    expect(
      screen.getByText('Usuario con perfil REST Services User y permisos de solo lectura.'),
    ).toBeInTheDocument()
  })

  it('editar la conexión precarga la dirección y el usuario, pero no la contraseña', async () => {
    const user = await renderConnected()

    await user.click(screen.getByRole('button', { name: 'Editar conexión' }))

    expect(screen.getByLabelText(URL_LABEL)).toHaveValue('http://10.0.0.5:8000')
    expect(screen.getByLabelText('Usuario')).toHaveValue('barb-reader')
    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Conectar y sincronizar' })).toBeDisabled()
  })

  it('muestra un error de red cuando la prueba no llega al backend', async () => {
    server.use(http.post(`${API}/cmdb/test`, () => HttpResponse.error()))
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Probar conexión' }))

    expect(await screen.findByText('✗ Error de red al probar la conexión.')).toBeInTheDocument()
  })

  it('muestra un error cuando no se puede guardar la conexión', async () => {
    server.use(http.post(`${API}/cmdb/connect`, () => HttpResponse.error()))
    const user = await openForm()
    await fillForm(user, VALID_CREDENTIALS)

    await user.click(screen.getByRole('button', { name: 'Conectar y sincronizar' }))

    expect(await screen.findByText('✗ No se pudo guardar la conexión.')).toBeInTheDocument()
    expect(screen.queryByText('iTop conectado')).not.toBeInTheDocument()
  })

  it('muestra el estado vacío cuando el inventario no tiene activos', async () => {
    server.use(http.get(`${API}/assets`, () => HttpResponse.json({ assets: [] })))
    await renderConnected()

    expect(
      await screen.findByText('No hay activos registrados en el inventario.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
