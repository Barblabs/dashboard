import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { AssetKind, SoftwareRole } from './assets'
import type { Downtime, Impact } from './businessContext'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import type { Override, Schemas } from './schemas'

export const VERDICTS = [
  'applies',
  'does_not_apply',
  'remediated',
  'should_be_earlier',
  'should_be_later',
] as const satisfies readonly Schemas['FeedbackRequestBody']['verdict'][]
export type Verdict = (typeof VERDICTS)[number]

/** The verdicts that have the Prioritizer place the Finding again in its next round. */
export const ORDER_VERDICTS: readonly Verdict[] = ['should_be_earlier', 'should_be_later']

export type TechniqueRole = 'exploitation' | 'primary_impact' | 'secondary_impact'

/** The inputs a Scoring Model replaced with a default, which make a Score estimated. */
export type DataGap = 'cvss_estimated' | 'epss_pending' | 'kev_stale' | 'criticality_unknown' | 'exposure_undeclared'

export type Technique = Override<Schemas['TechniqueResponse'], { role: TechniqueRole }>
export type CriticalService = Override<Schemas['CriticalServiceResponse'], { impact: Impact; max_downtime: Downtime }>

// The spec types these vocabularies as plain strings.
export type FindingDetails = Override<
  Schemas['FindingDetailsResponse'],
  {
    asset: Override<Schemas['FindingAssetResponse'], { kind: AssetKind; critical_services: CriticalService[] }>
    /** Blank when the Asset no longer runs the component. */
    component_role: SoftwareRole | ''
    score_details: Override<Schemas['ScoreResponse'], { data_gaps: DataGap[] }>
    techniques: Technique[]
  }
>
export type Finding = Override<Schemas['FindingResponse'], { details: FindingDetails }>
export type PriorityGroup = Schemas['PriorityGroupResponse']
export type ActionPlan = Schemas['PlanResponse']
export type Feedback = Override<Schemas['FeedbackResponse'], { verdict: Verdict }>
export type PrioritizationSummary = Schemas['PrioritizationSummaryResponse']
export type Prioritization = Override<
  Schemas['PrioritizationResponse'],
  { findings: Finding[]; plans: ActionPlan[]; feedback: Feedback[] }
>

/**
 * The newest Prioritization, the order to follow, and when the one before it was made: a
 * Finding placed after that is one the newest placed.
 */
export interface CurrentOrder {
  prioritization: Prioritization
  previousCreatedAt: string | null
}

export const PRIORITIZATIONS_KEY = [...connectionScopeKey, 'prioritizations'] as const

const CURRENT_KEY = [...PRIORITIZATIONS_KEY, 'current'] as const

async function fetchCurrentOrder(): Promise<CurrentOrder | null> {
  const { prioritizations } = await api.get<{ prioritizations: PrioritizationSummary[] }>(
    '/prioritizations?limit=2',
  )
  const [newest, previous] = prioritizations
  if (!newest) return null
  const prioritization = await api.get<Prioritization>(`/prioritizations/${newest.id}`)
  return { prioritization, previousCreatedAt: previous?.created_at ?? null }
}

/** `null` until the Prioritizer has ordered the Customer's Findings for the first time. */
export function useCurrentOrderQuery() {
  return useQuery({ queryKey: CURRENT_KEY, queryFn: fetchCurrentOrder })
}

/** Whether the newest Prioritization is the one that placed the Finding. */
export function placedByNewest(order: CurrentOrder, finding: Finding): boolean {
  return (
    order.previousCreatedAt === null ||
    new Date(finding.placed_at).getTime() > new Date(order.previousCreatedAt).getTime()
  )
}

function updateCurrent(queryClient: QueryClient, id: string, change: (p: Prioritization) => Prioritization) {
  queryClient.setQueryData<CurrentOrder | null>(CURRENT_KEY, (current) =>
    current && current.prioritization.id === id
      ? { ...current, prioritization: change(current.prioritization) }
      : current,
  )
}

/** Asks Luna for the Action Plan of a Finding, which takes up to a minute. */
export function useCreatePlanMutation(prioritizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (findingId: string) =>
      api.post<ActionPlan>(`/prioritizations/${prioritizationId}/plans`, { finding_id: findingId }),
    onSuccess: (plan) =>
      updateCurrent(queryClient, prioritizationId, (p) => ({
        ...p,
        plans: [...p.plans.filter((other) => other.finding_id !== plan.finding_id), plan],
      })),
  })
}

export interface FeedbackInput {
  findingId: string
  verdict: Verdict
  note: string
}

export function useRecordFeedbackMutation(prioritizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ findingId, verdict, note }: FeedbackInput) =>
      api.post<Feedback>(`/prioritizations/${prioritizationId}/feedback`, { finding_id: findingId, verdict, note }),
    onSuccess: (feedback) =>
      updateCurrent(queryClient, prioritizationId, (p) => ({ ...p, feedback: [...p.feedback, feedback] })),
  })
}
