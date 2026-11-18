import { z, type ZodType } from 'zod'
import type { Area } from '../api/areas'
import { mockAreas } from './areas'
import { localStore } from './localStore'

const areaSchema = z.strictObject({
  id: z.number().int(),
  name: z.string(),
  record_id: z.string(),
  source_id: z.string(),
  active: z.boolean(),
  inactive_since: z.string().nullable(),
  owner_email: z.string().nullable(),
}) satisfies ZodType<Area>

export const areasStore = localStore('barbattack_mock_areas', z.array(areaSchema), mockAreas)
