// Handlers and test overrides must match the exact URLs the API client requests.
export function apiUrl(path: string) {
  return `${import.meta.env.VITE_API_URL}${path}`
}
