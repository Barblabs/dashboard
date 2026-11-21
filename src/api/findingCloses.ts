import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import { invalidateFindingsStats } from './findingsSummary'
import { refetchPrioritizations } from './prioritizations'
import { everyOf, type Known, type Schemas } from './schemas'

/** Why a User closes a Finding by hand (ADR 0035). */
export type CloseReason = Schemas['CloseRequestBody']['reason']

export const CLOSE_REASONS = everyOf<CloseReason>()(['remediated', 'false_positive', 'accepted_risk', 'postponed'])

/** The reasons that hold a Finding closed until a day, after which a match reopens it. */
const UNTIL_REASONS = ['accepted_risk', 'postponed'] as const satisfies readonly CloseReason[]
type UntilReason = (typeof UNTIL_REASONS)[number]
type ForGoodReason = Exclude<CloseReason, UntilReason>

export function closesUntil(reason: CloseReason): reason is UntilReason {
  return UNTIL_REASONS.some((r) => r === reason)
}

/** `reopen_at` is set exactly for the reasons that hold a Finding closed until a day. */
export type ManualClose = Known<Schemas['CloseRequestBody']> &
  ({ reason: ForGoodReason; reopen_at?: never } | { reason: UntilReason; reopen_at: string })

export type ClosedFinding = Omit<Schemas['ClosedFindingResponse'], 'reason' | 'reopen_at'> &
  ({ reason: ForGoodReason; reopen_at: null } | { reason: UntilReason; reopen_at: string })

type ClosedFindings = Omit<Schemas['ClosedFindingsResponse'], 'findings'> & { findings: ClosedFinding[] }

const CLOSED_KEY = [...connectionScopeKey, 'findings-closed'] as const

/** The Customer's Findings closed by hand, newest close first; those closed on their own are left out. */
export function useClosedFindingsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: CLOSED_KEY,
    queryFn: async () => (await api.get<ClosedFindings>('/findings/closed')).findings,
    enabled,
  })
}

/*
 * Closing and reopening answer with no body, so there is nothing to put in the cache: the
 * Findings are fetched again, and the mutation stays pending until the order and the closed
 * list show the change, so a closed Finding never offers to be closed twice. A failure also
 * refetches: a 409 means someone else changed the Finding first.
 */
async function findingChanged(queryClient: QueryClient) {
  invalidateFindingsStats(queryClient)
  await Promise.all([refetchPrioritizations(queryClient), queryClient.invalidateQueries({ queryKey: CLOSED_KEY })])
}

export function useCloseFindingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ findingId, close }: { findingId: string; close: ManualClose }) =>
      api.post<void>(`/findings/${findingId}/close`, close),
    onSettled: () => findingChanged(queryClient),
  })
}

/** Only a Finding closed by hand reopens by hand; one closed on its own waits for a match. */
export function useReopenFindingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (findingId: string) => api.post<void>(`/findings/${findingId}/reopen`),
    onSettled: () => findingChanged(queryClient),
  })
}
