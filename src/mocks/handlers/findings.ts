import { delay, http, HttpResponse } from 'msw'
import { z, type ZodType } from 'zod'
import { CLOSE_REASONS, closesUntil, type ClosedFinding } from '../../api/findingCloses'
import type { Finding, HistoryEntry, Prioritization } from '../../api/prioritizations'
import type { Known, Schemas } from '../../api/schemas'
import { assetsStore } from '../assets-store'
import { closedFindingsStore } from '../closed-findings-store'
import { findingHistoryStore } from '../finding-history-store'
import { prioritizationsStore } from '../prioritizations-store'
import { apiUrl } from '../url'
import { mockCaller } from './auth'
import { failure, parsedBody } from './responses'

const closeBody = z.object({
  reason: z.enum(CLOSE_REASONS),
  note: z.string(),
  reopen_at: z.iso.datetime({ offset: true }).optional(),
}) satisfies ZodType<Known<Schemas['CloseRequestBody']>>

/** barbackend's checks after the body, in its order (internal/findings/manual.go). */
function invalidClose({ reason, note, reopen_at }: z.infer<typeof closeBody>): boolean {
  const why = note.trim()
  if (why === '' || why.length > 2000) return true
  if (closesUntil(reason) !== (reopen_at !== undefined)) return true
  return reopen_at !== undefined && new Date(reopen_at).getTime() <= Date.now()
}

/** A Platform Admin sees no Customer's Findings. */
function refusedCaller(): Response | null {
  return mockCaller().role === 'platform_admin' ? failure(403, 'forbidden', 'a platform admin acts for no customer') : null
}

/** The Finding as the newest Prioritization that placed it has it. */
function findFinding(id: string): Finding | undefined {
  for (const p of prioritizationsStore.load()) {
    const finding = p.findings.find((f) => f.finding_id === id)
    if (finding) return finding
  }
  return undefined
}

/** Applies `change` to the Finding in every Prioritization that placed it. */
function saveFinding(id: string, change: (finding: Finding) => Finding) {
  prioritizationsStore.save(
    prioritizationsStore.load().map(
      (p): Prioritization => ({ ...p, findings: p.findings.map((f) => (f.finding_id === id ? change(f) : f)) }),
    ),
  )
}

function closedByHand(finding: Finding, close: z.infer<typeof closeBody>): ClosedFinding {
  const base = {
    id: finding.finding_id,
    cve_id: finding.cve_id,
    asset_id: assetsStore.load().find((a) => a.name === finding.asset_name)?.id ?? 0,
    asset_name: finding.asset_name,
    vendor: '',
    product: '',
    component_name: finding.component,
    component_version: finding.version,
    note: close.note.trim(),
    closed_at: new Date().toISOString(),
    closed_by: mockCaller().email,
  }
  const { reason, reopen_at } = close
  if (!closesUntil(reason)) return { ...base, reason, reopen_at: null }
  // invalidClose already turned away an until reason without its day.
  return { ...base, reason, reopen_at: new Date(reopen_at ?? Date.now()).toISOString() }
}

/** How the oldest round that holds the Finding placed it, for a Finding with no story of its own in the store. */
function placedByOldest(finding: Finding): HistoryEntry[] {
  for (const p of prioritizationsStore.load().toReversed()) {
    const group = p.groups.find((g) => g.finding_ids.includes(finding.finding_id))
    if (!group) continue
    return [
      {
        prioritization_id: p.id,
        created_at: p.created_at,
        kind: 'placed',
        group_before: null,
        group_now: group.position,
        rank_before: null,
        rank_now: finding.score_rank,
        title: group.title,
        reason: group.reason,
        evidence: group.evidence
          .filter((e) => e.finding_id === finding.finding_id)
          .map(({ path, value }) => ({ path, value })),
        changes: [],
        band: null,
        score: null,
        feedback: [],
        groups_appeared: [],
        groups_gone: [],
        close_reason: null,
      },
    ]
  }
  return []
}

/*
 * The Finding's history, newest first. A closed Finding leaves the order at the next round;
 * the mock tells it at once, so closing one shows in its history without waiting.
 */
function historyOf(finding: Finding): HistoryEntry[] {
  const stored = findingHistoryStore.load()[finding.finding_id] ?? placedByOldest(finding)
  const [last] = stored
  if (finding.closed_at === null || !last || last.kind === 'left') return stored
  const close = closedFindingsStore.load().find((c) => c.id === finding.finding_id)
  const left: HistoryEntry = {
    prioritization_id: `closed-${finding.finding_id}`,
    created_at: finding.closed_at,
    kind: 'left',
    group_before: last.group_now,
    group_now: null,
    rank_before: last.rank_now,
    rank_now: null,
    title: '',
    reason: '',
    evidence: [],
    changes: [],
    band: null,
    score: null,
    feedback: [],
    groups_appeared: [],
    groups_gone: [],
    close_reason: close?.reason ?? null,
  }
  return [left, ...stored]
}

export const findingsHandlers = [
  http.post(apiUrl('/findings/:id/close'), async ({ params, request }) => {
    const body = await parsedBody(request, closeBody)
    if (body instanceof Response) return body
    const refused = refusedCaller()
    if (refused) return refused
    if (invalidClose(body)) return failure(400, 'invalid_request', 'invalid close')
    const id = String(params.id)
    const finding = findFinding(id)
    if (!finding) return failure(404, 'finding_not_found', 'finding not found')
    if (finding.closed_at !== null) return failure(409, 'finding_closed', 'finding is already closed')
    const closed = closedByHand(finding, body)
    closedFindingsStore.save([closed, ...closedFindingsStore.load()])
    saveFinding(id, (f) => ({ ...f, closed_at: closed.closed_at, current: null }))
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(apiUrl('/findings/:id/reopen'), ({ params }) => {
    const refused = refusedCaller()
    if (refused) return refused
    const id = String(params.id)
    const finding = findFinding(id)
    if (!finding) return failure(404, 'finding_not_found', 'finding not found')
    const closed = closedFindingsStore.load()
    if (finding.closed_at === null || !closed.some((c) => c.id === id)) {
      return failure(409, 'finding_not_closed_by_hand', 'finding is not closed by hand')
    }
    closedFindingsStore.save(closed.filter((c) => c.id !== id))
    // Until the Prioritizer places it again, it stands as it was placed.
    saveFinding(id, (f) => {
      const { criticality, exposure, information_classification, lifecycle_stage } = f.details.asset
      return {
        ...f,
        closed_at: null,
        current: {
          asset: { criticality, exposure, information_classification, lifecycle_stage },
          score_details: f.details.score_details,
        },
      }
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // barbackend reads the path's UUID before the caller, and the caller before the Finding.
  http.get(apiUrl('/findings/:id/history'), ({ params }) => {
    const id = String(params.id)
    if (!z.uuid().safeParse(id).success) return failure(400, 'invalid_request', 'id must be a UUID')
    const refused = refusedCaller()
    if (refused) return refused
    const finding = findFinding(id)
    if (!finding) return failure(404, 'finding_not_found', 'finding not found')
    return HttpResponse.json({ entries: historyOf(finding) })
  }),

  http.get(apiUrl('/findings/closed'), () => {
    const refused = refusedCaller()
    if (refused) return refused
    return HttpResponse.json({ findings: closedFindingsStore.load() })
  }),

  http.get(apiUrl('/findings/summary'), async () => {
    await delay()
    return HttpResponse.json({
      // A close by hand counts at once; the rest of the counts are fixed.
      open: 23 - closedFindingsStore.load().length,
      critical: 5,
      high: 8,
      medium: 7,
      low: 3,
      unbanded: 0,
      kev: 4,
      critical_internet_facing: 3,
    })
  }),

  http.get(apiUrl('/findings/weekly-trend'), async () => {
    await delay()
    return HttpResponse.json({
      weeks: [
        { week: '2026-W38', starts_on: '2026-09-15', opened: 4, closed: 2, open_at_end: 18 },
        { week: '2026-W39', starts_on: '2026-09-22', opened: 3, closed: 3, open_at_end: 18 },
        { week: '2026-W40', starts_on: '2026-09-29', opened: 5, closed: 1, open_at_end: 22 },
        { week: '2026-W41', starts_on: '2026-10-06', opened: 2, closed: 4, open_at_end: 20 },
        { week: '2026-W42', starts_on: '2026-10-13', opened: 6, closed: 2, open_at_end: 24 },
        { week: '2026-W43', starts_on: '2026-10-20', opened: 1, closed: 5, open_at_end: 20 },
        { week: '2026-W44', starts_on: '2026-10-27', opened: 3, closed: 1, open_at_end: 22 },
        { week: '2026-W45', starts_on: '2026-11-03', opened: 2, closed: 1, open_at_end: 23 },
      ],
    })
  }),

  http.get(apiUrl('/findings/time-to-close'), async () => {
    await delay()
    return HttpResponse.json({
      bands: [
        { band: 'critical', median_days: 3.5, average_days: 4.1, closed: 12 },
        { band: 'high', median_days: 7.2, average_days: 8.0, closed: 25 },
        { band: 'medium', median_days: 14.1, average_days: 15.3, closed: 18 },
        { band: 'low', median_days: null, average_days: null, closed: 0 },
        { band: 'unbanded', median_days: 45.0, average_days: 47.2, closed: 5 },
      ],
    })
  }),
]
