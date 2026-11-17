import { http, HttpResponse } from 'msw'
import type { NewsDigestSummary } from '../../api/newsDigests'
import { newsDigestsStore } from '../news-digests-store'
import { apiUrl } from '../url'
import { failure } from './responses'

// barbackend's page size: 20 unless asked, from 1 to 100.
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export const newsDigestsHandlers = [
  http.get(apiUrl('/news-digests'), ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? DEFAULT_LIMIT)
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return failure(400, 'invalid_request', 'validation failed')
    }
    const news_digests = newsDigestsStore
      .load()
      .slice(0, limit)
      .map(({ id, created_at, since, until, counts }): NewsDigestSummary => ({ id, created_at, since, until, counts }))
    return HttpResponse.json({ news_digests })
  }),

  http.get(apiUrl('/news-digests/:id'), ({ params }) => {
    const digest = newsDigestsStore.load().find((d) => d.id === params.id)
    if (!digest) return failure(404, 'news_digest_not_found', 'news digest not found')
    return HttpResponse.json(digest)
  }),
]
