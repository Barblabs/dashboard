import { delay, http, HttpResponse } from 'msw'
import { VERDICTS, type ActionPlan, type Feedback, type Finding, type Prioritization } from '../../api/prioritizations'
import { prioritizationsStore } from '../prioritizations-store'
import { apiUrl } from '../url'
import { failure, isOneOf } from './responses'

function find(id: string) {
  const all = prioritizationsStore.load()
  return { all, prioritization: all.find((p) => p.id === id) }
}

function save(all: Prioritization[], changed: Prioritization) {
  prioritizationsStore.save(all.map((p) => (p.id === changed.id ? changed : p)))
}

// What Luna answers in mock mode: built from the Finding, never more than its details say.
function mockPlan(finding: Finding): ActionPlan {
  const { details } = finding
  const component = `${finding.component} ${finding.version}`
  return {
    finding_id: finding.finding_id,
    created_at: new Date().toISOString(),
    model: 'claude-haiku-5-5',
    prompt_id: 'mock',
    output: {
      summary: `${finding.cve_id} afecta ${component} en ${finding.asset_name}.`,
      steps: [
        `Confirma qué versión de ${finding.component} está instalada en ${finding.asset_name}.`,
        `Busca en el aviso del fabricante la versión que corrige ${finding.cve_id} y actualiza ${finding.component}.`,
      ],
      fixed_version: null,
      mitigation: details.kev?.required_action ?? null,
      verification: `Confirma que ${finding.component} ya no está en la versión ${finding.version}.`,
      sources: details.references.slice(0, 1),
      attack_mitigations: details.techniques.flatMap((t) =>
        t.mitigations.map((m) => ({
          mitigation_id: m.attack_id,
          technique_id: t.attack_id,
          step: `${m.name}: ${m.advice}`,
        })),
      ),
    },
  }
}

export const prioritizationsHandlers = [
  http.get(apiUrl('/prioritizations'), ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 20)
    const prioritizations = prioritizationsStore
      .load()
      .slice(0, limit)
      .map(({ id, created_at, findings, groups }) => ({ id, created_at, findings: findings.length, groups: groups.length }))
    return HttpResponse.json({ prioritizations })
  }),

  http.get(apiUrl('/prioritizations/:id'), ({ params }) => {
    const { prioritization } = find(String(params.id))
    if (!prioritization) return failure(404, 'prioritization_not_found', 'prioritization not found')
    return HttpResponse.json(prioritization)
  }),

  http.post(apiUrl('/prioritizations/:id/plans'), async ({ params, request }) => {
    const { all, prioritization } = find(String(params.id))
    if (!prioritization) return failure(404, 'prioritization_not_found', 'prioritization not found')
    const { finding_id } = (await request.json()) as { finding_id: string }
    const finding = prioritization.findings.find((f) => f.finding_id === finding_id)
    if (!finding) return failure(404, 'finding_not_found', 'finding not found')
    // Luna takes a while; tests run without the wait.
    if (import.meta.env.MODE !== 'test') await delay(2500)
    const plan = mockPlan(finding)
    save(all, { ...prioritization, plans: [...prioritization.plans.filter((p) => p.finding_id !== finding_id), plan] })
    return HttpResponse.json(plan, { status: 201 })
  }),

  http.post(apiUrl('/prioritizations/:id/feedback'), async ({ params, request }) => {
    const { all, prioritization } = find(String(params.id))
    if (!prioritization) return failure(404, 'prioritization_not_found', 'prioritization not found')
    const body = (await request.json()) as { finding_id: string; verdict: string; note?: string }
    if (!isOneOf(VERDICTS, body.verdict)) return failure(400, 'invalid_request', 'unknown verdict')
    if (!prioritization.findings.some((f) => f.finding_id === body.finding_id)) {
      return failure(404, 'finding_not_found', 'finding not found')
    }
    const feedback: Feedback = {
      id: crypto.randomUUID(),
      finding_id: body.finding_id,
      author_id: 'mock-user',
      verdict: body.verdict,
      note: body.note ?? '',
      via_analista: false,
      created_at: new Date().toISOString(),
    }
    save(all, { ...prioritization, feedback: [...prioritization.feedback, feedback] })
    return HttpResponse.json(feedback, { status: 201 })
  }),
]
