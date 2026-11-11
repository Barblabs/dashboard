import { HttpResponse } from 'msw'

// The backend's error body: `code` is what the frontend translates, `error` the raw message.
export function failure(status: number, code: string, error: string) {
  return HttpResponse.json({ code, error }, { status })
}

export function isOneOf<T extends string>(options: readonly T[], value: string): value is T {
  return options.some((option) => option === value)
}
