import { delay, http, HttpResponse } from 'msw'
import type { CmdbLogin, CmdbSource, CmdbSourceRequest } from '../../api/cmdb'
import { clearSource, loadSource, saveSource } from '../store'
import { apiUrl } from '../url'

function failure(status: number, code: string, error: string) {
  return HttpResponse.json({ code, error }, { status })
}

function notConnected() {
  return failure(404, 'not_connected', 'no CMDB source is connected')
}

function rejectAdminWithoutRestProfile({ user }: CmdbLogin) {
  if (user !== 'admin') return null
  return {
    code: 'missing_rest_profile',
    error:
      "The user 'admin' does not have the 'REST Services User' profile in iTop. Create a dedicated user with that profile.",
  }
}

export const cmdbHandlers = [
  http.get(apiUrl('/cmdb/source'), async () => {
    await delay(300)
    return HttpResponse.json(loadSource())
  }),

  http.post(apiUrl('/cmdb/source/test'), async ({ request }) => {
    const login = (await request.json()) as CmdbSourceRequest
    await delay(1200)
    const rejected = rejectAdminWithoutRestProfile(login)
    return HttpResponse.json(rejected ? { ok: false, ...rejected } : { ok: true })
  }),

  http.post(apiUrl('/cmdb/source'), async ({ request }) => {
    const { provider, url, user, password } = (await request.json()) as CmdbSourceRequest
    await delay(1500)
    if (loadSource()) {
      return failure(409, 'already_connected', 'a CMDB source is already connected')
    }
    const rejected = rejectAdminWithoutRestProfile({ url, user, password })
    if (rejected) return failure(422, rejected.code, rejected.error)
    const source: CmdbSource = {
      provider,
      url,
      user,
      lastSync: new Date().toISOString(),
      lastSyncFailure: null,
    }
    saveSource(source)
    return HttpResponse.json(source)
  }),

  http.put(apiUrl('/cmdb/source'), async ({ request }) => {
    const login = (await request.json()) as CmdbLogin
    await delay(800)
    const current = loadSource()
    if (!current) return notConnected()
    const rejected = rejectAdminWithoutRestProfile(login)
    if (rejected) return failure(422, rejected.code, rejected.error)
    const source: CmdbSource = { ...current, url: login.url, user: login.user }
    saveSource(source)
    return HttpResponse.json(source)
  }),

  http.post(apiUrl('/cmdb/source/sync'), async () => {
    await delay(2000)
    const source = loadSource()
    if (!source) return notConnected()
    const lastSync = new Date().toISOString()
    saveSource({ ...source, lastSync, lastSyncFailure: null })
    return HttpResponse.json({
      lastSync,
      created: 0,
      updated: 0,
      deactivated: 0,
      reactivated: 0,
      skipped: 0,
    })
  }),

  http.delete(apiUrl('/cmdb/source'), async () => {
    await delay(500)
    if (!loadSource()) return notConnected()
    clearSource()
    return new HttpResponse(null, { status: 204 })
  }),
]
