import { z, type ZodType } from 'zod'
import type { ClosedFinding } from '../api/findingCloses'
import { localStore } from './localStore'

// What GET /findings/closed answers, checked as it is read: see `localStore`.

const closedBase = {
  id: z.string(),
  cve_id: z.string(),
  asset_id: z.number().int(),
  asset_name: z.string(),
  vendor: z.string(),
  product: z.string(),
  component_name: z.string(),
  component_version: z.string(),
  note: z.string(),
  closed_at: z.string(),
  closed_by: z.string(),
}

const closedFinding = z.union([
  z.strictObject({ ...closedBase, reason: z.enum(['remediated', 'false_positive']), reopen_at: z.null() }),
  z.strictObject({ ...closedBase, reason: z.enum(['accepted_risk', 'postponed']), reopen_at: z.string() }),
]) satisfies ZodType<ClosedFinding>

/** The Findings closed by hand, newest close first, as barbackend lists them. None until a User closes one. */
export const closedFindingsStore = localStore('barbattack_mock_closed_findings', z.array(closedFinding), [])
