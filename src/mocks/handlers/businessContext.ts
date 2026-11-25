import { delay, http, HttpResponse } from 'msw'
import { z, type ZodType } from 'zod'
import { isStated, type BusinessContextFields, type DraftSource } from '../../api/businessContext'
import type { Schemas } from '../../api/schemas'
import { businessContextSchema } from '../../pages/BusinessContext/schema'
import { KEY_FIELDS, businessContextStore, MOCK_DRAFT } from '../business-context-store'
import { mockCriticalServices } from '../critical-services'
import { apiUrl } from '../url'
import { failure, parsedBody, refusedCaller } from './responses'

const saveBody = z.object({ version: z.number().int(), context: businessContextSchema }) satisfies ZodType<{
  version: number
  context: BusinessContextFields
}>

export const draftSourceBody = z.object({
  text: z.string().optional(),
  files: z.array(z.object({ name: z.string(), media_type: z.string(), data: z.string() })).optional(),
}) satisfies ZodType<DraftSource>

const gaps = (context: BusinessContextFields) => KEY_FIELDS.filter((path) => !isStated(context, path))

// Like the backend: a save follows the version it read, and the headquarters is a country.
export const businessContextHandlers = [
  http.get(apiUrl('/business-context'), () => HttpResponse.json(businessContextStore.load())),

  http.put(apiUrl('/business-context'), async ({ request }) => {
    const body = await parsedBody(request, saveBody)
    if (body instanceof Response) return body
    const { version, context } = body
    const current = businessContextStore.load()
    if (version !== current.version) {
      return failure(409, 'business_context_stale', 'the business context changed since it was read')
    }
    const hq = context.geography.headquarters
    const countries = context.geography.countries
    const normalized = {
      ...context,
      geography: { headquarters: hq, countries: hq && !countries.includes(hq) ? [hq, ...countries] : countries },
    }
    const saved = {
      version: version + 1,
      saved_at: new Date().toISOString(),
      saved_by: 'admin@barbattack.example',
      context: normalized,
      key_fields: KEY_FIELDS,
      gaps: gaps(normalized),
    }
    businessContextStore.save(saved)
    return HttpResponse.json(saved)
  }),

  http.post(apiUrl('/business-context/draft'), async ({ request }) => {
    const source = await parsedBody(request, draftSourceBody)
    if (source instanceof Response) return source
    const files = source.files ?? []
    if ((files.length === 0 && !source.text) || files.some((f) => f.media_type.startsWith('image/'))) {
      return failure(400, 'invalid_document', 'invalid document')
    }
    // The real Drafter takes a while; tests run without the wait.
    if (import.meta.env.MODE !== 'test') await delay(2500)
    return HttpResponse.json({ context: MOCK_DRAFT, gaps: gaps(MOCK_DRAFT) })
  }),

  http.get(apiUrl('/critical-services'), async () => {
    const refused = refusedCaller()
    if (refused) return refused
    await delay()
    return HttpResponse.json<Schemas['CriticalServiceHealthListResponse']>({ critical_services: mockCriticalServices })
  }),
]
