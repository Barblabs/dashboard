import axios from 'axios'

/*
 * `network` means the backend never answered (down, CORS, offline), so there is no
 * status; an `http` failure always has one, plus the backend's code when it sends one.
 */
export type ApiFailure =
  | { kind: 'http'; status: number; code: string | null }
  | { kind: 'network' }

// What the backend sends for a failure, in an error body or a result body alike.
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

// The backend's failure code, if the error is a request failure that carries one.
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

apiClient.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(toApiError(error)),
)

// Callers only ever need the response body.
export const api = {
  get: <T>(url: string) => apiClient.get<T>(url).then((response) => response.data),
  post: <T>(url: string, body?: unknown) =>
    apiClient.post<T>(url, body).then((response) => response.data),
  put: <T>(url: string, body?: unknown) =>
    apiClient.put<T>(url, body).then((response) => response.data),
  delete: (url: string) => apiClient.delete(url).then(() => undefined),
}
