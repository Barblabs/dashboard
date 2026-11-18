import { z, type ZodType } from 'zod'

/*
 * One mock resource kept in localStorage, so mock mode survives a reload and each test
 * starts clean once setup clears the storage. `load` hands out a copy of the fallback:
 * a handler changing what it loaded cannot change the fixture.
 *
 * What is stored is parsed against `schema` on load: storage is also written by hand
 * (the verify-dashboard skill seeds it) and by older builds, so it is not known to fit.
 * Data that does not fit fails the request loudly, naming the store, rather than reaching
 * the dashboard in a shape the backend never sends.
 */
export function localStore<T>(key: string, schema: ZodType<T>, fallback: T) {
  return {
    load(): T {
      const raw = localStorage.getItem(key)
      if (!raw) return structuredClone(fallback)
      const stored: unknown = JSON.parse(raw)
      const parsed = schema.safeParse(stored)
      if (!parsed.success) {
        throw new Error(`The mock store ${key} holds data that does not fit:\n${z.prettifyError(parsed.error)}`)
      }
      return parsed.data
    },
    save(value: T) {
      localStorage.setItem(key, JSON.stringify(value))
    },
    clear() {
      localStorage.removeItem(key)
    },
  }
}
