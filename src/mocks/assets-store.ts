import { z, type ZodType } from 'zod'
import {
  ASSET_KINDS,
  CRITICALITIES,
  EXPOSURES,
  INFORMATION_CLASSIFICATIONS,
  LIFECYCLE_STAGES,
  SOFTWARE_ROLES,
  type Asset,
} from '../api/assets'
import { mockAssets } from './assets'
import { localStore } from './localStore'

// A Declaration's value, `declared_by` and `declared_at` are all set or all null, as the type says.
const exposureSchema = z.discriminatedUnion('source', [
  z.strictObject({
    source: z.literal('imported'),
    value: z.enum(EXPOSURES).nullable(),
    imported: z.enum(EXPOSURES).nullable(),
    declared_by: z.null(),
    declared_at: z.null(),
  }),
  z.strictObject({
    source: z.literal('declared'),
    value: z.enum(EXPOSURES),
    imported: z.enum(EXPOSURES).nullable(),
    declared_by: z.string(),
    declared_at: z.string(),
  }),
])

const informationClassificationSchema = z.union([
  z.strictObject({ value: z.null(), declared_by: z.null(), declared_at: z.null() }),
  z.strictObject({ value: z.enum(INFORMATION_CLASSIFICATIONS), declared_by: z.string(), declared_at: z.string() }),
])

const assetSchema = z.strictObject({
  id: z.number().int(),
  name: z.string(),
  description: z.string(),
  kind: z.enum(ASSET_KINDS),
  record_id: z.string(),
  source_id: z.string(),
  active: z.boolean(),
  inactive_since: z.string().nullable(),
  retired: z.boolean(),
  lifecycle_stage: z.enum(LIFECYCLE_STAGES).nullable(),
  criticality: z.enum(CRITICALITIES).nullable(),
  exposure: exposureSchema,
  information_classification: informationClassificationSchema,
  area: z.strictObject({ id: z.number().int(), name: z.string() }).nullable(),
  owner: z.strictObject({ email: z.string(), source: z.enum(['declared', 'imported']) }).nullable(),
  hardware: z.strictObject({ vendor: z.string(), model: z.string() }).nullable(),
  software: z.array(
    z.strictObject({
      name: z.string(),
      version: z.string(),
      role: z.enum(SOFTWARE_ROLES),
      product: z.strictObject({ vendor: z.string(), name: z.string() }).nullable(),
    }),
  ),
}) satisfies ZodType<Asset>

export const assetsStore = localStore('barbattack_mock_assets', z.array(assetSchema), mockAssets)
