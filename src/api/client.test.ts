import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '../mocks/url'
import { server } from '../test/server'
import { api } from './client'

describe('api', () => {
  it("leaves the User-Agent to the browser, since axios's own forces a CORS preflight the backend rejects", async () => {
    let userAgent: string | null = null
    server.use(
      http.get(apiUrl('/probe'), ({ request }) => {
        userAgent = request.headers.get('User-Agent')
        return HttpResponse.json({})
      }),
    )

    await api.get('/probe')

    expect(userAgent ?? '').not.toContain('axios')
  })
})
