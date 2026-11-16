import { z, type ZodType } from 'zod'
import { CMDB_PROVIDERS, type CmdbSource } from '../api/cmdb'
import { localStore } from './localStore'

export const mockSource: Omit<CmdbSource, 'last_sync'> = {
  provider: 'itop',
  url: 'http://10.0.0.5:8000',
  user: 'barb-reader',
  last_sync_failure: null,
}

const sourceSchema = z.strictObject({
  provider: z.enum(CMDB_PROVIDERS),
  url: z.string(),
  user: z.string().nullable(),
  last_sync: z.string().nullable(),
  last_sync_failure: z.strictObject({ at: z.string(), error: z.string() }).nullable(),
}) satisfies ZodType<CmdbSource>

export const sourceStore = localStore('barbattack_cmdb_source', sourceSchema.nullable(), null)
