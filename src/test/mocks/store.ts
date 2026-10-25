import type { CmdbSource } from '../../api/cmdb'

const STORAGE_KEY = 'barbattack_cmdb_source'

export const mockSource: Omit<CmdbSource, 'lastSync'> = {
  provider: 'itop',
  url: 'http://10.0.0.5:8000',
  user: 'barb-reader',
  lastSyncFailure: null,
}

export function loadSource(): CmdbSource | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as CmdbSource) : null
}

export function saveSource(source: CmdbSource) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(source))
}

export function clearSource() {
  localStorage.removeItem(STORAGE_KEY)
}
