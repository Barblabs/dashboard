import { z, type ZodType } from 'zod'
import { RELEVANCES, type NewsDigest } from '../api/newsDigests'

// What the news digests store holds, checked as it is read: see `localStore`.

const counts = z.strictObject({
  named: z.number().int(),
  finding: z.number().int(),
  footprint: z.number().int(),
  peer: z.number().int(),
})

const attack = z.strictObject({
  victim: z.string(),
  domain: z.string().nullable(),
  sectors: z.array(z.string()),
  countries: z.array(z.string()),
  kind: z.string().nullable(),
  attacker: z.string().nullable(),
})

const item = z.strictObject({
  news_item_id: z.string(),
  feed: z.string(),
  kind: z.enum(['article', 'leak_post']),
  title: z.string(),
  link: z.string(),
  language: z.string(),
  published_at: z.string(),
  summary: z.string().nullable(),
  excerpt: z.string().nullable(),
  labels: z.array(z.string()),
  reasons: z.array(z.string()),
  why: z.string().nullable(),
  context_evidence: z.array(z.strictObject({ path: z.string(), value: z.string() })),
  attacks: z.array(attack),
  cve_ids: z.array(z.string()),
})

export const newsDigestSchema = z.strictObject({
  id: z.string(),
  created_at: z.string(),
  since: z.string(),
  until: z.string(),
  counts,
  business_context_version: z.number().int().nullable(),
  no_sectors: z.boolean(),
  editor: z.strictObject({
    status: z.enum(['verified', 'rejected', 'refused', 'failed']),
    model: z.string(),
    prompt_id: z.string(),
  }),
  groups: z.array(z.strictObject({ relevance: z.enum(RELEVANCES), items: z.array(item) })),
}) satisfies ZodType<NewsDigest>
