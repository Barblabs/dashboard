import { everyOf, type Schemas } from './schemas'

/** Why a User closes a Finding by hand (ADR 0035). */
type CloseReason = Schemas['CloseRequestBody']['reason']

export const CLOSE_REASONS = everyOf<CloseReason>()(['remediated', 'false_positive', 'accepted_risk', 'postponed'])

/** The reasons that hold a Finding closed until a day, after which a match reopens it. */
const UNTIL_REASONS = ['accepted_risk', 'postponed'] as const satisfies readonly CloseReason[]
type UntilReason = (typeof UNTIL_REASONS)[number]
type ForGoodReason = Exclude<CloseReason, UntilReason>

export function closesUntil(reason: CloseReason): reason is UntilReason {
  return UNTIL_REASONS.some((r) => r === reason)
}

export type ClosedFinding = Omit<Schemas['ClosedFindingResponse'], 'reason' | 'reopen_at'> &
  ({ reason: ForGoodReason; reopen_at: null } | { reason: UntilReason; reopen_at: string })
