import type { ParseKeys, TFunction } from 'i18next'
import { ApiError, errorCode, type BackendFailure } from '../api/client'

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

interface RequestErrorKeys {
  fallback: ParseKeys
  network?: ParseKeys
}

// A type alias, not an interface: i18next options need its implicit index signature.
type MessageValues = { user?: string }

export function translatedOrBackendMessage(
  { code, error }: BackendFailure,
  t: TFunction<'translation'>,
  fallback: ParseKeys,
  values: MessageValues = {},
): string {
  const key = CODE_KEYS.get(code)
  if (key) return t(key, values)
  return error || t(fallback)
}

export function requestErrorText(
  error: Error,
  t: TFunction<'translation'>,
  keys: RequestErrorKeys,
  values: MessageValues = {},
): string {
  if (error instanceof ApiError && error.failure.kind === 'network') {
    return t(keys.network ?? keys.fallback)
  }
  const code = errorCode(error)
  if (!code) return t(keys.fallback)
  return translatedOrBackendMessage({ code, error: error.message }, t, keys.fallback, values)
}
