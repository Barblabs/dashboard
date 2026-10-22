import axios from 'axios'

export type ApiErrorKind = 'http' | 'network'

interface ApiErrorInit {
  kind: ApiErrorKind
  message: string
  status?: number
  code?: string
}

/*
 * Every request failure surfaces as an ApiError. `kind: 'network'` means the backend
 * never answered (down, CORS, offline), so there is no status.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string | null

  constructor({ kind, message, status, code }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status ?? null
    this.code = code ?? null
  }
}

interface ErrorBody {
  error?: unknown
  code?: unknown
}

// Cancellations and non-axios errors are not request failures: they pass through untouched.
function toApiError(error: unknown): unknown {
  if (!axios.isAxiosError(error) || axios.isCancel(error)) return error
  if (!error.response) return new ApiError({ kind: 'network', message: error.message })

  const { status, data } = error.response
  const body = (typeof data === 'object' && data !== null ? data : {}) as ErrorBody
  return new ApiError({
    kind: 'http',
    status,
    code: typeof body.code === 'string' ? body.code : undefined,
    message: typeof body.error === 'string' ? body.error : error.message,
  })
}

/*
 * Fetch adapter instead of XHR: it is the transport the app already used, and jsdom's
 * XHR enforces CORS on MSW responses, which lack those headers.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  adapter: 'fetch',
})

apiClient.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(toApiError(error)),
)
