import type { ParseKeys } from 'i18next'
import { ApiError } from '../api/client'

/*
 * Stable failure codes from the backend (docs/contrato-cmdb.md), whether they arrive in
 * a result body or an HTTP error. A Map, not an object literal: a code like
 * "constructor" must not hit the prototype.
 */
const CODE_KEYS = new Map<string, ParseKeys>([
  ['missing_rest_profile', 'config.form.testErrors.missingRestProfile'],
])

export function codeKey(code: string | null | undefined): ParseKeys | undefined {
  return code ? CODE_KEYS.get(code) : undefined
}

interface RequestErrorKeys {
  fallback: ParseKeys
  network?: ParseKeys
}

// A known backend code wins; otherwise the network message, if the caller has one, or the fallback.
export function requestErrorKey(error: Error, keys: RequestErrorKeys): ParseKeys {
  if (!(error instanceof ApiError)) return keys.fallback
  if (error.failure.kind === 'network') return keys.network ?? keys.fallback
  return codeKey(error.failure.code) ?? keys.fallback
}
