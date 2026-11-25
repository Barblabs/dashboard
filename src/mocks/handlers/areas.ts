import { delay, http, HttpResponse } from 'msw'
import { z, type ZodType } from 'zod'
import type { Area, AreaListResponse } from '../../api/areas'
import { ACTIVITY_FILTERS } from '../../api/assets'
import { isOneOf, type Known, type Schemas } from '../../api/schemas'
import { mockAreaHealth } from '../area-health'
import { areasStore } from '../areas-store'
import { apiUrl } from '../url'
import { mockCaller } from './auth'
import { failure, parsedBody } from './responses'

const setAreaOwnerBody = z.object({ email: z.string().nullable() }) satisfies ZodType<Known<Schemas['SetAreaOwnerRequest']>>

export const areasHandlers = [
  http.get(apiUrl('/areas'), ({ request }) => {
    const active = new URL(request.url).searchParams.get('active') ?? 'true'
    if (!isOneOf(ACTIVITY_FILTERS, active)) {
      return failure(400, 'invalid_request', 'invalid active')
    }
    const matches = (area: Area) => active === 'all' || area.active === (active === 'true')
    const areas = areasStore.load()
      .filter(matches)
      .toSorted((a, b) => a.name.localeCompare(b.name))
    return HttpResponse.json<AreaListResponse>({ areas })
  }),

  http.get(apiUrl('/areas/health'), async () => {
    if (mockCaller().role === 'platform_admin') return failure(403, 'forbidden', 'a platform admin acts for no customer')
    await delay()
    return HttpResponse.json<Schemas['AreaHealthListResponse']>({ areas: mockAreaHealth })
  }),

  http.put(apiUrl('/areas/:id/owner'), async ({ params, request }) => {
    const body = await parsedBody(request, setAreaOwnerBody)
    if (body instanceof Response) return body
    const { email } = body
    const id = Number(params['id'])
    const areas = areasStore.load()
    const area = areas.find((a) => a.id === id)
    if (!area) return failure(404, 'not_found', 'area not found')
    if (email !== null && !z.email().safeParse(email).success) {
      return failure(400, 'invalid_request', 'invalid email')
    }
    const updated: Area = { ...area, owner_email: email }
    areasStore.save(areas.map((a) => (a.id === id ? updated : a)))
    return HttpResponse.json(updated)
  }),
]
