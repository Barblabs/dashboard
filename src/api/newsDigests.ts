import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import { everyOf, type Schemas } from './schemas'

export type Relevance = Schemas['NewsGroupResponse']['relevance']

/** Closest first: the order the backend groups a News Digest in. */
export const RELEVANCES = everyOf<Relevance>()(['named', 'finding', 'footprint', 'peer'])

export type NewsCounts = Schemas['NewsCountsResponse']
export type NewsDigestSummary = Schemas['NewsDigestSummaryResponse']
type NewsDigestList = Schemas['NewsDigestListResponse']

/*
 * A Reported Attack: the source's claim, never confirmed. Its sectors and kind are codes of
 * the Business Context's vocabularies, which the spec types as plain strings.
 */
export type NewsAttack = Schemas['NewsAttackResponse']
export type NewsItem = Schemas['NewsItemResponse']
export type NewsGroup = Schemas['NewsGroupResponse']
export type NewsDigest = Schemas['NewsDigestResponse']

/** How many digests a reader can go back to: a month of daily ones. */
const LISTED = 30

const NEWS_DIGESTS_KEY = ['news-digests'] as const

/** Newest first; empty until the Editor writes the Customer's first News Digest. */
export function useNewsDigestsQuery() {
  return useQuery({
    queryKey: [...NEWS_DIGESTS_KEY, 'list'],
    queryFn: () => api.get<NewsDigestList>(`/news-digests?limit=${LISTED}`),
  })
}

/** A digest never changes once written, so going back to one reads it from the cache. */
export function useNewsDigestQuery(id: string) {
  return useQuery({
    queryKey: [...NEWS_DIGESTS_KEY, id],
    queryFn: () => api.get<NewsDigest>(`/news-digests/${id}`),
    staleTime: Infinity,
  })
}
