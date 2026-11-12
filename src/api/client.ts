import axios from 'axios'
import { signOut } from '../auth/signOut'
import { useAuthStore } from '../auth/store'
import { TokensUnreachable } from '../auth/tokens'
import { tokens } from '../auth/tokenSource'
import type { Schemas } from './schemas'

/*
 * `network` means the backend never answered (down, CORS, offline), so there is no
 * status; an `http` failure always has one, plus the backend's code when it sends one.
 */
export type ApiFailure =
  | { kind: 'http'; status: number; code: string | null }
  | { kind: 'network' }

/** The body of a failure the backend explains: a stable code and a readable message. */
export type BackendFailure = Schemas['CodedError']

// Every request failure surfaces as an ApiError.
export class ApiError extends Error {
  readonly failure: ApiFailure

  constructor(message: string, failure: ApiFailure) {
    super(message)
    this.name = 'ApiError'
    this.failure = failure
  }
}

export function errorCode(error: Error | null): string | null {
  return error instanceof ApiError && error.failure.kind === 'http' ? error.failure.code : null
}

/*
 * What a failed request means for the session: `rejected` (401) signs out, `deactivated`
 * (the Customer was deactivated) ends it on the deactivated screen. Decided here once, for
 * every request and for verifying stored tokens alike.
 */
export type AuthOutcome = 'rejected' | 'deactivated'

/** `null` when the failure says nothing about the session. */
export function authOutcomeOf(error: unknown): AuthOutcome | null {
  if (!(error instanceof ApiError) || error.failure.kind !== 'http') return null
  const { status, code } = error.failure
  if (status === 401) return 'rejected'
  if (status === 403 && code === 'customer_deactivated') return 'deactivated'
  return null
}

interface ErrorBody {
  error?: unknown
  code?: unknown
}

// Cancellations and non-axios errors are not request failures: they pass through untouched.
function toApiError(error: unknown): unknown {
  if (!axios.isAxiosError(error) || axios.isCancel(error)) return error
  if (!error.response) return new ApiError(error.message, { kind: 'network' })

  const { status, data } = error.response
  const body = (typeof data === 'object' && data !== null ? data : {}) as ErrorBody
  return new ApiError(typeof body.error === 'string' ? body.error : error.message, {
    kind: 'http',
    status,
    code: typeof body.code === 'string' ? body.code : null,
  })
}

/*
 * Fetch adapter instead of XHR: it is the transport the app already used, and jsdom's
 * XHR enforces CORS on MSW responses, which lack those headers.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  adapter: 'fetch',
})

// Asked per request, so an expired token is renewed before the request goes out.
apiClient.interceptors.request.use(async (config) => {
  let token: string | null
  try {
    token = await tokens.currentAccessToken()
  } catch (error) {
    // Cognito out of reach is, to the caller, the same as the backend out of reach.
    if (error instanceof TokensUnreachable) throw new ApiError(error.message, { kind: 'network' })
    throw error
  }
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  const failure = toApiError(error)
  const outcome = authOutcomeOf(failure)
  if (outcome === 'rejected') signOut()
  else if (outcome === 'deactivated') useAuthStore.getState().deactivate()
  return Promise.reject(failure)
})

// Callers only ever need the response body.
export const api = {
  get: <T>(url: string) => apiClient.get<T>(url).then((r) => r.data),
  post: <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data),
  put: <T>(url: string, body?: unknown) => apiClient.put<T>(url, body).then((r) => r.data),
  patch: <T>(url: string, body?: unknown) => apiClient.patch<T>(url, body).then((r) => r.data),
  delete: <T = void>(url: string) => apiClient.delete<T>(url).then((r) => r.data),
}
