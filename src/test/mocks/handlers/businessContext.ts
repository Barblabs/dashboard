import { delay, http, HttpResponse } from 'msw'
import type { BusinessContextFields, DraftSource } from '../../../api/businessContext'
import { isStated } from '../../../pages/BusinessContext/model'
import { KEY_FIELDS, loadBusinessContext, MOCK_DRAFT, saveBusinessContext } from '../business-context-store'
import { apiUrl } from '../url'

function failure(status: number, code: string, error: string) {
  return HttpResponse.json({ code, error }, { status })
}

const gaps = (context: BusinessContextFields) => KEY_FIELDS.filter((path) => !isStated(context, path))

// Like the backend: a save follows the version it read, and the headquarters is a country.
export const businessContextHandlers = [
  http.get(apiUrl('/business-context'), () => HttpResponse.json(loadBusinessContext())),

  http.put(apiUrl('/business-context'), async ({ request }) => {
    const { version, context } = (await request.json()) as { version: number; context: BusinessContextFields }
    const current = loadBusinessContext()
    if (version !== current.version) {
      return failure(409, 'business_context_stale', 'the business context changed since it was read')
    }
    const hq = context.geography.headquarters.toUpperCase()
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
    saveBusinessContext(saved)
    return HttpResponse.json(saved)
  }),

  http.post(apiUrl('/business-context/draft'), async ({ request }) => {
    const source = (await request.json()) as DraftSource
    const files = source.files ?? []
    if ((files.length === 0 && !source.text) || files.some((f) => f.media_type.startsWith('image/'))) {
      return failure(400, 'invalid_document', 'invalid document')
    }
    // The real Drafter takes a while; tests run without the wait.
    if (import.meta.env.MODE !== 'test') await delay(2500)
    return HttpResponse.json({ context: MOCK_DRAFT, gaps: gaps(MOCK_DRAFT) })
  }),
]
