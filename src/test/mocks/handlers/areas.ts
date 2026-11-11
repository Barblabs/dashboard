import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { Area, AreaListResponse } from '../../../api/areas'
import { ACTIVITY_FILTERS } from '../../../api/assets'
import type { components } from '../../../api/generated'
import { loadAreas, saveAreas } from '../areas-store'
import { apiUrl } from '../url'
import { failure, isOneOf } from './responses'

type SetAreaOwnerRequest = components['schemas']['SetAreaOwnerRequest']

export const areasHandlers = [
  http.get(apiUrl('/areas'), ({ request }) => {
    const active = new URL(request.url).searchParams.get('active') ?? 'true'
    if (!isOneOf(ACTIVITY_FILTERS, active)) {
      return failure(400, 'invalid_request', 'invalid active')
    }
    const matches = (area: Area) => active === 'all' || area.active === (active === 'true')
    const areas = loadAreas()
      .filter(matches)
      .toSorted((a, b) => a.name.localeCompare(b.name))
    return HttpResponse.json<AreaListResponse>({ areas })
  }),

  http.put(apiUrl('/areas/:id/owner'), async ({ params, request }) => {
    const id = Number(params['id'])
    const { email } = (await request.json()) as SetAreaOwnerRequest
    const areas = loadAreas()
    const area = areas.find((a) => a.id === id)
    if (!area) return failure(404, 'not_found', 'area not found')
    if (email !== null && !z.email().safeParse(email).success) {
      return failure(400, 'invalid_request', 'invalid email')
    }
    const updated: Area = { ...area, owner_email: email }
    saveAreas(areas.map((a) => (a.id === id ? updated : a)))
    return HttpResponse.json(updated)
  }),
]
