import { delay, http, HttpResponse } from 'msw'
import type { CmdbConnection, CmdbCredentials } from '../api/types'
import { mockAssetsResponse } from './assets'

const API = import.meta.env.VITE_API_URL as string
const STORAGE_KEY = 'barbattack_cmdb'

function loadConnection(): CmdbConnection | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as CmdbConnection) : null
}

export function saveConnection(connection: CmdbConnection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connection))
}

function notConnected() {
  return HttpResponse.json({ error: 'No hay fuente CMDB conectada' }, { status: 404 })
}

export const handlers = [
  http.get(`${API}/cmdb/connection`, async () => {
    await delay(300)
    return HttpResponse.json(loadConnection())
  }),

  /*
   * La prueba falla si el usuario es exactamente "admin": es el superusuario
   * de iTop pero no tiene por defecto el perfil "REST Services User" que el
   * backend requiere. Cualquier otro usuario tiene éxito.
   */
  http.post(`${API}/cmdb/test`, async ({ request }) => {
    const { user } = (await request.json()) as CmdbCredentials
    await delay(1200)
    if (user === 'admin') {
      return HttpResponse.json({
        ok: false,
        error:
          "El usuario 'admin' no tiene el perfil 'REST Services User' en iTop. Crea un usuario dedicado con ese perfil.",
      })
    }
    return HttpResponse.json({ ok: true })
  }),

  http.post(`${API}/cmdb/connect`, async ({ request }) => {
    const { url, user } = (await request.json()) as CmdbCredentials
    await delay(1500)
    const connection: CmdbConnection = {
      provider: 'itop',
      url,
      user,
      lastSync: new Date().toISOString(),
    }
    saveConnection(connection)
    return HttpResponse.json(connection)
  }),

  http.post(`${API}/cmdb/sync`, async () => {
    await delay(2000)
    const connection = loadConnection()
    if (!connection) {
      return notConnected()
    }
    const lastSync = new Date().toISOString()
    saveConnection({ ...connection, lastSync })
    return HttpResponse.json({
      lastSync,
      created: 0,
      updated: 0,
      deactivated: 0,
      reactivated: 0,
      skipped: 0,
    })
  }),

  http.delete(`${API}/cmdb/connection`, async () => {
    await delay(500)
    if (!loadConnection()) {
      return notConnected()
    }
    localStorage.removeItem(STORAGE_KEY)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/assets`, () => HttpResponse.json(mockAssetsResponse)),
]
