import type { CmdbConnection } from '../api/cmdb'

// The fake backend persists the connection in localStorage so it survives reloads.
const STORAGE_KEY = 'barbattack_cmdb'

export const mockConnection: Omit<CmdbConnection, 'lastSync'> = {
  provider: 'itop',
  url: 'http://10.0.0.5:8000',
  user: 'barb-reader',
}

export function loadConnection(): CmdbConnection | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as CmdbConnection) : null
}

export function saveConnection(connection: CmdbConnection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connection))
}

export function clearConnection() {
  localStorage.removeItem(STORAGE_KEY)
}
