import axios from 'axios'

export type ApiErrorKind = 'http' | 'network'

interface ApiErrorInit {
  kind: ApiErrorKind
  message: string
  status?: number
  code?: string
}

/*
 * Toda falla de red sale como ApiError. `kind: 'network'` indica que no hubo
 * respuesta del backend (caído, CORS, sin conexión) y no trae status.
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

// Las cancelaciones y los errores ajenos a axios no son fallas de red: pasan intactos.
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
 * Adaptador fetch en vez de XHR: es el transporte que ya usaba la app, y el
 * XHR de jsdom aplica CORS a las respuestas de MSW, que no traen esas cabeceras.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  adapter: 'fetch',
})

apiClient.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(toApiError(error)),
)
