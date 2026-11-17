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

  http.get(apiUrl('/findings/weekly-trend'), async () => {
    await delay()
    return HttpResponse.json({
      weeks: [
        { week: '2026-09-21', opened: 4, closed: 2, backlog: 18 },
        { week: '2026-09-28', opened: 3, closed: 3, backlog: 18 },
        { week: '2026-10-05', opened: 5, closed: 1, backlog: 22 },
        { week: '2026-10-12', opened: 2, closed: 4, backlog: 20 },
        { week: '2026-10-19', opened: 6, closed: 2, backlog: 24 },
        { week: '2026-10-26', opened: 1, closed: 5, backlog: 20 },
        { week: '2026-11-02', opened: 3, closed: 1, backlog: 22 },
        { week: '2026-11-09', opened: 2, closed: 1, backlog: 23 },
      ],
    })
  }),

  http.get(apiUrl('/findings/time-to-close'), async () => {
    await delay()
    return HttpResponse.json({
      bands: [
        { band: 'critical', median_days: 3.5, average_days: 4.1, closed: 12 },
        { band: 'high', median_days: 7.2, average_days: 8.0, closed: 25 },
        { band: 'medium', median_days: 14.1, average_days: 15.3, closed: 18 },
        { band: 'low', median_days: null, average_days: null, closed: 0 },
        { band: 'unbanded', median_days: 45.0, average_days: 47.2, closed: 5 },
      ],
    })
  }),
]
