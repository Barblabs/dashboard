import axios from 'axios'
import { accessTokenOf, useAuthStore } from '../auth/store'

/*
 * `network` means the backend never answered (down, CORS, offline), so there is no
 * status; an `http` failure always has one, plus the backend's code when it sends one.
 */
export type ApiFailure =
  | { kind: 'http'; status: number; code: string | null }
  | { kind: 'network' }

export interface BackendFailure {
  code: string
  error: string
}

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

apiClient.interceptors.request.use((config) => {
  const token = accessTokenOf(useAuthStore.getState().session)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && !axios.isCancel(error) && error.response) {
    const { status, data } = error.response
    const body = (typeof data === 'object' && data !== null ? data : {}) as ErrorBody
    const code = typeof body.code === 'string' ? body.code : null
    if (status === 401) useAuthStore.getState().endSession()
    else if (status === 403 && code === 'customer_deactivated') useAuthStore.getState().deactivate()
  }
  return Promise.reject(toApiError(error))
})

// Callers only ever need the response body.
export const api = {
  get: <T>(url: string) => apiClient.get<T>(url).then((r) => r.data),
  post: <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data),
  put: <T>(url: string, body?: unknown) => apiClient.put<T>(url, body).then((r) => r.data),
  patch: <T>(url: string, body?: unknown) => apiClient.patch<T>(url, body).then((r) => r.data),
  delete: (url: string) => apiClient.delete(url).then(() => undefined),
}
