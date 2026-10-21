import type { CmdbConnection, CmdbTestResult } from '../api/types'

const LS_KEY = 'barbattack_cmdb'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function mockGetConnection(): Promise<CmdbConnection | null> {
  await delay(300)
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return null
  return JSON.parse(raw) as CmdbConnection
}

/*
 * Regla de fallo del mock:
 * La prueba falla si el campo usuario es exactamente "admin".
 * Razón: "admin" es el superusuario de iTop pero no tiene el perfil
 * "REST Services User" por defecto, que es el que el backend requiere.
 * Para cualquier otro usuario con URL válida, el mock siempre tiene éxito.
 */
export async function mockTestConnection(
  _url: string,
  user: string,
  _password: string,
): Promise<CmdbTestResult> {
  await delay(1200)
  if (user === 'admin') {
    return {
      ok: false,
      error:
        "El usuario 'admin' no tiene el perfil 'REST Services User' en iTop. Crea un usuario dedicado con ese perfil.",
    }
  }
  return { ok: true }
}

export async function mockConnect(
  url: string,
  user: string,
  _password: string,
): Promise<void> {
  await delay(1500)
  const conn: CmdbConnection = {
    provider: 'itop',
    url,
    user,
    lastSync: new Date().toISOString(),
  }
  localStorage.setItem(LS_KEY, JSON.stringify(conn))
}

export async function mockDisconnect(): Promise<void> {
  await delay(500)
  localStorage.removeItem(LS_KEY)
}

export async function mockSyncNow(): Promise<void> {
  await delay(2000)
  const raw = localStorage.getItem(LS_KEY)
  if (raw) {
    const conn = JSON.parse(raw) as CmdbConnection
    conn.lastSync = new Date().toISOString()
    localStorage.setItem(LS_KEY, JSON.stringify(conn))
  }
}
