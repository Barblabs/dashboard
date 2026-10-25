import type { ParseKeys, TFunction } from 'i18next'
import { ApiError } from '../api/client'

/*
 * Stable failure codes from the backend (docs/contrato-cmdb.md), whether they arrive in
 * a result body or an HTTP error. A Map, not an object literal: a code like
 * "constructor" must not hit the prototype.
 */
const CODE_KEYS = new Map<string, ParseKeys>([
  ['unreachable', 'config.errors.unreachable'],
  ['tls_error', 'config.errors.tlsError'],
  ['invalid_credentials', 'config.errors.invalidCredentials'],
  ['unexpected_response', 'config.errors.unexpectedResponse'],
  ['missing_rest_profile', 'config.errors.missingRestProfile'],
  ['invalid_request', 'config.errors.invalidRequest'],
  ['invalid_login', 'config.errors.invalidLogin'],
  ['not_connected', 'config.errors.notConnected'],
  ['already_connected', 'config.errors.alreadyConnected'],
  ['sync_in_progress', 'config.errors.syncInProgress'],
  ['sync_failed', 'config.errors.syncFailed'],
  ['internal_error', 'config.errors.internalError'],
])

export function codeKey(code: string | null | undefined): ParseKeys | undefined {
  return code ? CODE_KEYS.get(code) : undefined
}

interface RequestErrorKeys {
  fallback: ParseKeys
  network?: ParseKeys
}

// A type alias, not an interface: i18next options need its implicit index signature.
type MessageValues = { user?: string }

/*
 * A known backend code is translated; an unknown one shows the backend's own message,
 * since codes can ship before the frontend knows them. Without a code there is only
 * the network message, if the caller has one, or the fallback.
 */
export function requestErrorText(
  error: Error,
  t: TFunction<'translation'>,
  keys: RequestErrorKeys,
  values: MessageValues = {},
): string {
  if (!(error instanceof ApiError)) return t(keys.fallback)
  if (error.failure.kind === 'network') return t(keys.network ?? keys.fallback)
  const { code } = error.failure
  const key = codeKey(code)
  if (key) return t(key, values)
  return code ? error.message : t(keys.fallback)
}
