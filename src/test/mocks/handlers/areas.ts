import { http, HttpResponse } from 'msw'
import type { Area, AreaListResponse } from '../../../api/areas'
import { ACTIVITY_FILTERS } from '../../../api/assets'
import { loadAreas } from '../areas-store'
import { apiUrl } from '../url'

function isActivityFilter(value: string) {
  return ACTIVITY_FILTERS.some((option) => option === value)
}

export const areasHandlers = [
  http.get(apiUrl('/areas'), ({ request }) => {
    const active = new URL(request.url).searchParams.get('active') ?? 'true'
    if (!isActivityFilter(active)) {
      return HttpResponse.json({ code: 'invalid_request', error: 'invalid active' }, { status: 400 })
    }
    const matches = (area: Area) => active === 'all' || area.active === (active === 'true')
    const areas = loadAreas()
      .filter(matches)
      .toSorted((a, b) => a.name.localeCompare(b.name))
    return HttpResponse.json<AreaListResponse>({ areas })
  }),
]
