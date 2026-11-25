import { HttpResponse } from 'msw'
import type { ZodType } from 'zod'
import { mockCaller } from './auth'

// The backend's error body: `code` is what the frontend translates, `error` the raw message.
export function failure(status: number, code: string, error: string) {
  return HttpResponse.json({ code, error }, { status })
}

/*
 * The request body parsed against the schema barbackend reads it with. Like barbackend, a body
 * that is not JSON or does not fit is answered 400 `invalid_request` before anything else.
 */
export async function parsedBody<T>(request: Request, schema: ZodType<T>): Promise<T | Response> {
  const body: unknown = await request.json().catch(() => undefined)
  const parsed = schema.safeParse(body)
  return parsed.success ? parsed.data : failure(400, 'invalid_request', 'validation failed')
}

/** A Platform Admin acts for no Customer, so barbackend refuses it what is a Customer's. */
export function refusedCaller(): Response | null {
  return mockCaller().role === 'platform_admin' ? failure(403, 'forbidden', 'a platform admin acts for no customer') : null
}
