import { delay, http, HttpResponse } from 'msw'
import type { CmdbConnection, CmdbCredentials } from '../../api/cmdb'
import { clearConnection, loadConnection, saveConnection } from '../store'
import { apiUrl } from '../url'

function notConnected() {
  return HttpResponse.json({ error: 'No CMDB source is connected' }, { status: 404 })
}

export const cmdbHandlers = [
  http.get(apiUrl('/cmdb/connection'), async () => {
    await delay(300)
    return HttpResponse.json(loadConnection())
  }),

  /*
   * The test fails when the user is exactly "admin": it is the iTop superuser
   * but lacks, by default, the "REST Services User" profile the backend
   * requires. Any other user succeeds. The failure carries the code proposed
   * in docs/contrato-cmdb.md alongside the human-readable message.
   */
  http.post(apiUrl('/cmdb/test'), async ({ request }) => {
    const { user } = (await request.json()) as CmdbCredentials
    await delay(1200)
    if (user === 'admin') {
      return HttpResponse.json({
        ok: false,
        code: 'missing_rest_profile',
        error:
          "The user 'admin' does not have the 'REST Services User' profile in iTop. Create a dedicated user with that profile.",
      })
    }
    return HttpResponse.json({ ok: true })
  }),

  http.post(apiUrl('/cmdb/connect'), async ({ request }) => {
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

  http.post(apiUrl('/cmdb/sync'), async () => {
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

  http.delete(apiUrl('/cmdb/connection'), async () => {
    await delay(500)
    if (!loadConnection()) {
      return notConnected()
    }
    clearConnection()
    return new HttpResponse(null, { status: 204 })
  }),
]
