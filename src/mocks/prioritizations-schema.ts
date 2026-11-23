import { z, type ZodType } from 'zod'
import { ASSET_KINDS, SOFTWARE_ROLES } from '../api/assets'
import { DOWNTIMES, IMPACTS } from '../api/businessContext'
import { DATA_GAPS, RECORDED_VERDICTS, type Prioritization } from '../api/prioritizations'

// What the prioritizations store holds, checked as it is read: see `localStore`.

const assetCriticality = z.enum(['high', 'medium', 'low', 'unknown'])
const assetExposure = z.enum(['internet_facing', 'internal', 'unknown'])
const assetInformationClassification = z.enum(['highly_confidential', 'confidential', 'private', 'public', 'unclassified'])
const assetLifecycleStage = z.enum(['production', 'implementation', 'stock', 'unknown'])

const scoreDetails = z.strictObject({
  scoring_model: z.number().int(),
  value: z.number(),
  vulnerability: z.number(),
  band: z.enum(['critical', 'high', 'medium', 'low']).nullable(),
  alpha: z.number(),
  beta: z.number(),
  gamma: z.number(),
  exploit_signal: z.number().nullable(),
  criticality_multiplier: z.number(),
  exposure_multiplier: z.number(),
  lifecycle_multiplier: z.number(),
  information_classification_multiplier: z.number().nullable(),
  data_gaps: z.array(z.enum(DATA_GAPS)),
})

const technique = z.strictObject({
  attack_id: z.string(),
  name: z.string(),
  role: z.enum(['exploitation', 'primary_impact', 'secondary_impact']),
  tactics: z.array(z.string()),
  labeled_as: z.string(),
  evidence: z.string(),
  rationale: z.string(),
  mitigations: z.array(z.strictObject({ attack_id: z.string(), name: z.string(), advice: z.string() })),
})

const findingDetails = z.strictObject({
  description: z.string(),
  component_role: z.enum(['', ...SOFTWARE_ROLES]),
  asset: z.strictObject({
    name: z.string(),
    kind: z.enum(ASSET_KINDS),
    criticality: assetCriticality,
    exposure: assetExposure,
    information_classification: assetInformationClassification,
    lifecycle_stage: assetLifecycleStage,
    critical_services: z.array(
      z.strictObject({
        name: z.string(),
        description: z.string(),
        impact: z.enum(['', ...IMPACTS]),
        max_downtime: z.enum(['', ...DOWNTIMES]),
      }),
    ),
  }),
  cvss: z.array(z.strictObject({ type: z.string(), version: z.string(), vector: z.string(), base_score: z.number() })),
  epss: z.strictObject({ probability: z.number(), percentile: z.number(), score_date: z.string() }).nullable(),
  kev: z
    .strictObject({
      date_added: z.string(),
      due_date: z.string(),
      required_action: z.string(),
      known_ransomware_campaign_use: z.string(),
    })
    .nullable(),
  advisories: z.array(
    z.strictObject({ feed: z.string(), title: z.string(), description: z.string(), published: z.string() }),
  ),
  references: z.array(z.string()),
  labeling: z.strictObject({ model: z.string(), outcome: z.enum(['labeled', 'none', 'failed', 'not_tried']) }),
  techniques: z.array(technique),
  score_details: scoreDetails,
  unavailable_feeds: z.array(z.string()),
})

const finding = z.strictObject({
  finding_id: z.string(),
  cve_id: z.string(),
  asset_name: z.string(),
  component: z.string(),
  version: z.string(),
  group: z.number().int(),
  score: z.number(),
  score_rank: z.number().int(),
  placed_at: z.string(),
  closed_at: z.string().nullable(),
  details: findingDetails,
  current: z
    .strictObject({
      asset: z.strictObject({
        criticality: assetCriticality,
        exposure: assetExposure,
        information_classification: assetInformationClassification,
        lifecycle_stage: assetLifecycleStage,
      }),
      score_details: scoreDetails,
    })
    .nullable(),
})

const group = z.strictObject({
  position: z.number().int(),
  title: z.string(),
  reason: z.string(),
  finding_ids: z.array(z.string()),
  evidence: z.array(z.strictObject({ finding_id: z.string(), path: z.string(), value: z.string() })),
  context_evidence: z.array(z.strictObject({ path: z.string(), value: z.string() })),
})

const plan = z.strictObject({
  finding_id: z.string(),
  created_at: z.string(),
  model: z.string(),
  prompt_id: z.string(),
  output: z.strictObject({
    summary: z.string(),
    steps: z.array(z.string()),
    fixed_version: z.string().nullable(),
    mitigation: z.string().nullable(),
    verification: z.string(),
    sources: z.array(z.string()),
    attack_mitigations: z.array(
      z.strictObject({ mitigation_id: z.string(), technique_id: z.string(), step: z.string() }),
    ),
  }),
})

const feedback = z.strictObject({
  id: z.string(),
  finding_id: z.string(),
  author_id: z.string(),
  verdict: z.enum(RECORDED_VERDICTS),
  note: z.string(),
  via_analista: z.boolean(),
  created_at: z.string(),
})

export const prioritizationSchema = z.strictObject({
  id: z.string(),
  previous_id: z.string().nullable(),
  created_at: z.string(),
  model: z.string(),
  prompt_id: z.string(),
  business_context_version: z.number().int().nullable(),
  findings: z.array(finding),
  groups: z.array(group),
  plans: z.array(plan),
  feedback: z.array(feedback),
}) satisfies ZodType<Prioritization>
