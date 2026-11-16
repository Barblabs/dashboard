import { http, HttpResponse } from 'msw'
import { z, type ZodType } from 'zod'
import { CMDB_PROVIDERS, type CmdbLogin, type CmdbSource, type CmdbSourceRequest } from '../../api/cmdb'
import { sourceStore } from '../cmdb-store'
import { apiUrl } from '../url'
import { failure, parsedBody } from './responses'

const loginBody = z.object({ url: z.string(), user: z.string(), password: z.string() }) satisfies ZodType<CmdbLogin>

const sourceBody = loginBody.extend({ provider: z.enum(CMDB_PROVIDERS) }) satisfies ZodType<CmdbSourceRequest>

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
    return HttpResponse.json(sourceStore.load())
  }),

  http.post(apiUrl('/cmdb/source/test'), async ({ request }) => {
    const login = await parsedBody(request, sourceBody)
    if (login instanceof Response) return login
    const rejected = rejectAdminWithoutRestProfile(login)
    return HttpResponse.json(rejected ? { ok: false, ...rejected } : { ok: true })
  }),

  http.post(apiUrl('/cmdb/source'), async ({ request }) => {
    const body = await parsedBody(request, sourceBody)
    if (body instanceof Response) return body
    const { provider, url, user, password } = body
    if (sourceStore.load()) {
      return failure(409, 'already_connected', 'a CMDB source is already connected')
    }
    const rejected = rejectAdminWithoutRestProfile({ url, user, password })
    if (rejected) return failure(422, rejected.code, rejected.error)
    const source: CmdbSource = {
      provider,
      url,
      user,
      last_sync: new Date().toISOString(),
      last_sync_failure: null,
    }
    sourceStore.save(source)
    return HttpResponse.json(source)
  }),

  http.put(apiUrl('/cmdb/source'), async ({ request }) => {
    const login = await parsedBody(request, loginBody)
    if (login instanceof Response) return login
    const current = sourceStore.load()
    if (!current) return notConnected()
    const rejected = rejectAdminWithoutRestProfile(login)
    if (rejected) return failure(422, rejected.code, rejected.error)
    const source: CmdbSource = { ...current, url: login.url, user: login.user }
    sourceStore.save(source)
    return HttpResponse.json(source)
  }),

  http.post(apiUrl('/cmdb/source/sync'), async () => {
    const source = sourceStore.load()
    if (!source) return notConnected()
    const last_sync = new Date().toISOString()
    sourceStore.save({ ...source, last_sync, last_sync_failure: null })
    return HttpResponse.json({
      last_sync,
      created: 0,
      updated: 0,
      deactivated: 0,
      reactivated: 0,
      skipped: 0,
    })
  }),

  http.delete(apiUrl('/cmdb/source'), async () => {
    if (!sourceStore.load()) return notConnected()
    sourceStore.clear()
    return new HttpResponse(null, { status: 204 })
  }),
]
