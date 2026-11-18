/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** 'true' enables mock mode: MSW intercepts all requests, no backend or Cognito needed. */
  readonly VITE_USE_MOCK?: string
  // Cognito — required when VITE_USE_MOCK is not 'true'
  readonly VITE_COGNITO_REGION?: string
  readonly VITE_COGNITO_USER_POOL_ID?: string
  readonly VITE_COGNITO_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
