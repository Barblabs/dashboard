import { everyOf, type Schemas } from './schemas'

type Relevance = Schemas['NewsGroupResponse']['relevance']

/** Closest first: the order the backend groups a News Digest in. */
export const RELEVANCES = everyOf<Relevance>()(['named', 'finding', 'footprint', 'peer'])

export type NewsDigestSummary = Schemas['NewsDigestSummaryResponse']
export type NewsItem = Schemas['NewsItemResponse']
export type NewsDigest = Schemas['NewsDigestResponse']
