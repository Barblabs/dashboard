import { z, type ZodType } from 'zod'
import { HISTORY_CHANGES, type HistoryEntry } from '../api/prioritizations'
import { localStore } from './localStore'

// What GET /findings/{id}/history answers for the Findings with a story to tell, checked as it is read: see `localStore`.

const band = z.enum(['critical', 'high', 'medium', 'low'])
const order = z.strictObject({ from: z.number().int(), to: z.number().int() })

const historyEntry = z.strictObject({
  prioritization_id: z.string(),
  created_at: z.string(),
  kind: z.enum(['placed', 'placed_again', 'moved', 'left']),
  group_before: z.number().int().nullable(),
  group_now: z.number().int().nullable(),
  rank_before: z.number().int().nullable(),
  rank_now: z.number().int().nullable(),
  order_before: order.nullable(),
  order_now: order.nullable(),
  score_before: z.number().nullable(),
  score_now: z.number().nullable(),
  title: z.string(),
  reason: z.string(),
  evidence: z.array(z.strictObject({ path: z.string(), value: z.string() })),
  changes: z.array(z.enum(HISTORY_CHANGES)),
  band: z.strictObject({ from: band, to: band }).nullable(),
  feedback: z.array(
    z.strictObject({ verdict: z.enum(['should_be_earlier', 'should_be_later']), note: z.string(), created_at: z.string() }),
  ),
  groups_appeared: z.array(z.string()),
  groups_gone: z.array(z.string()),
  close_reason: z.string().nullable(),
}) satisfies ZodType<HistoryEntry>

const NEWEST = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e02'
const PREVIOUS = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e01'
// Older rounds, before the ones GET /prioritizations keeps in the mock.
const OLDER = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e00'
const OLDEST = '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4dff'

const G1 = 'Fallos con exploit activo sobre servicios expuestos a internet'
const G2 = 'Explotados activamente, activos internos con servicios de pago y CI/CD'
const G3 = 'Alta probabilidad de explotación en activos de soporte y cortafuegos perimetrales'

const none = {
  evidence: [],
  changes: [],
  band: null,
  feedback: [],
  groups_appeared: [],
  groups_gone: [],
  close_reason: null,
}

/** By Finding id, newest first. A Finding not listed tells only how the oldest round that holds it placed it. */
const HISTORIES: Record<string, HistoryEntry[]> = {
  // CVE-2024-23897 (Jenkins): climbed with KEV and a User's feedback, then dropped when a new group took the top.
  '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e05': [
    {
      ...none,
      prioritization_id: NEWEST,
      created_at: '2026-11-11T09:00:00Z',
      kind: 'moved',
      group_before: 1,
      group_now: 2,
      rank_before: 17,
      rank_now: 17,
      order_before: { from: 1, to: 5 },
      order_now: { from: 5, to: 9 },
      score_before: 0.19,
      score_now: 0.19,
      title: G2,
      reason:
        'CVE-2024-23897 está en KEV desde 2024-08-19 sobre Jenkins en ci-01, que publica a producción; su criticidad declarada es low, pero un atacante que lea archivos del controlador obtiene sus credenciales.',
      evidence: [{ path: '/kev/date_added', value: '2024-08-19' }],
      groups_appeared: [G1],
    },
    {
      ...none,
      prioritization_id: PREVIOUS,
      created_at: '2026-11-10T09:00:00Z',
      kind: 'placed_again',
      group_before: 3,
      group_now: 1,
      rank_before: 15,
      rank_now: 17,
      order_before: { from: 10, to: 15 },
      order_now: { from: 1, to: 5 },
      score_before: 0.15,
      score_now: 0.19,
      title: 'Explotados activamente sobre la cadena de publicación',
      reason:
        'CVE-2024-23897 sube al primer grupo: entró a KEV el 2024-08-19 y el equipo de plataforma pidió atenderlo antes porque ci-01 guarda los secretos de despliegue.',
      evidence: [{ path: '/kev/date_added', value: '2024-08-19' }],
      changes: ['kev_listed', 'band_changed', 'score_moved', 'feedback'],
      band: { from: 'low', to: 'medium' },
      feedback: [
        {
          verdict: 'should_be_earlier',
          note: 'ci-01 guarda los secretos de despliegue a producción.',
          created_at: '2026-11-09T16:40:00Z',
        },
      ],
    },
    {
      ...none,
      prioritization_id: OLDER,
      created_at: '2026-11-07T09:00:00Z',
      kind: 'placed',
      group_before: null,
      group_now: 3,
      rank_before: null,
      rank_now: 15,
      order_before: null,
      order_now: { from: 10, to: 15 },
      score_before: null,
      score_now: 0.15,
      title: G3,
      reason: 'CVE-2024-23897 afecta a Jenkins en ci-01, un activo interno de criticidad low sin servicios críticos declarados.',
    },
  ],
  // CVE-2021-41773 (Apache on web-01): ransomware, techniques and a new business context took it to the top.
  '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e03': [
    {
      ...none,
      prioritization_id: PREVIOUS,
      created_at: '2026-11-10T09:00:00Z',
      kind: 'placed_again',
      group_before: 2,
      group_now: 1,
      rank_before: 3,
      rank_now: 1,
      order_before: { from: 5, to: 8 },
      order_now: { from: 1, to: 4 },
      score_before: 0.91,
      score_now: 0.98,
      title: G1,
      reason:
        'CVE-2021-41773 y CVE-2021-42013 están en KEV sobre Apache 2.4.49 en web-01, expuesto a internet, con uso confirmado por ransomware; una sola actualización de Apache los corrige juntos.',
      evidence: [{ path: '/kev/known_ransomware_campaign_use', value: 'Known' }],
      changes: ['ransomware_use', 'labeled', 'score_moved', 'business_context'],
    },
    {
      ...none,
      prioritization_id: OLDEST,
      created_at: '2026-11-06T09:00:00Z',
      kind: 'placed',
      group_before: null,
      group_now: 2,
      rank_before: null,
      rank_now: 3,
      order_before: null,
      order_now: { from: 5, to: 8 },
      score_before: null,
      score_now: 0.91,
      title: 'Explotados activamente sobre activos expuestos',
      reason: 'CVE-2021-41773 está en KEV sobre Apache 2.4.49 en web-01, expuesto a internet.',
    },
  ],
  // CVE-2025-1094 (PostgreSQL): the last round looked at it again and left it where it was.
  '6b0f2c1e-8d3a-4f6b-9c21-1a2b3c4d5e01': [
    {
      ...none,
      prioritization_id: NEWEST,
      created_at: '2026-11-11T09:00:00Z',
      kind: 'placed_again',
      group_before: 2,
      group_now: 2,
      rank_before: 14,
      rank_now: 14,
      order_before: { from: 5, to: 8 },
      order_now: { from: 5, to: 9 },
      score_before: 0.3079,
      score_now: 0.3079,
      title: G2,
      reason:
        'CVE-2025-1094 tiene EPSS 0.9003 sobre PostgreSQL 15.6 en pg-prod-01, de criticidad high, que corre Pagos en línea; no está en KEV y el activo es interno.',
      evidence: [{ path: '/epss/probability', value: '0.9003' }],
    },
    {
      ...none,
      prioritization_id: PREVIOUS,
      created_at: '2026-11-10T09:00:00Z',
      kind: 'placed',
      group_before: null,
      group_now: 2,
      rank_before: null,
      rank_now: 14,
      order_before: null,
      order_now: { from: 5, to: 8 },
      score_before: null,
      score_now: 0.3079,
      title: G2,
      reason: 'CVE-2025-1094 tiene EPSS 0.9003 sobre PostgreSQL 15.6 en pg-prod-01, que corre Pagos en línea.',
      evidence: [{ path: '/epss/probability', value: '0.9003' }],
    },
  ],
}

export const findingHistoryStore = localStore(
  'barbattack_mock_finding_history',
  z.record(z.string(), z.array(historyEntry)),
  HISTORIES,
)
