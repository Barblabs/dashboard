import type { CmdbSource } from '../api/cmdb'
import { localStore } from './localStore'

export const mockSource: Omit<CmdbSource, 'last_sync'> = {
  provider: 'itop',
  url: 'http://10.0.0.5:8000',
  user: 'barb-reader',
  last_sync_failure: null,
}

export const {
  load: loadSource,
  save: saveSource,
  clear: clearSource,
} = localStore<CmdbSource | null>('barbattack_cmdb_source', null)
