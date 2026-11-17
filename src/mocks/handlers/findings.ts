import { delay, http, HttpResponse } from 'msw'
import { apiUrl } from '../url'

export const findingsHandlers = [
  http.get(apiUrl('/findings/summary'), async () => {
    await delay()
    return HttpResponse.json({
      open: 23,
      critical: 5,
      high: 8,
      medium: 7,
      low: 3,
      unbanded: 0,
      kev: 4,
      critical_internet_facing: 3,
    })
  }),
]
