import { currentScoreDetails } from '../../api/prioritizations'
import type { Prioritization, PriorityGroup } from '../../api/prioritizations'
import type { Band } from './bands'


export interface TopChange {
  findingId: string
  cveId: string
  component: string
  scoreGroup: number
  agentGroup: number
  delta: number
  agentGroupTitle: string
}

export interface MatrixData {
  groups: PriorityGroup[]
  matrix: number[][]
  cellIds: string[][][]
  rankRanges: [number, number][]
  subio: number
  seMantuvo: number
  bajo: number
  total: number
  bandByGroup: Record<Band, number>[]
  topChanges: TopChange[]
}

export function buildMatrix(p: Prioritization): MatrixData {
  const groups = p.groups.toSorted((a, b) => a.position - b.position)
  const sorted = p.findings.toSorted((a, b) => a.score_rank - b.score_rank)

  const scoreGroupOf = new Map<string, number>()
  const rankRanges: [number, number][] = []
  let offset = 0
  for (const g of groups) {
    const size = g.finding_ids.length
    const slice = sorted.slice(offset, offset + size)
    rankRanges.push([slice[0].score_rank, slice[slice.length - 1].score_rank])
    for (const f of slice) scoreGroupOf.set(f.finding_id, g.position)
    offset += size
  }

  const N = groups.length
  const matrix: number[][] = Array.from({ length: N }, () => Array<number>(N).fill(0))
  const cellIds: string[][][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => [] as string[]),
  )
  const bandByGroup: Record<Band, number>[] = Array.from({ length: N }, () => ({
    critical: 0, high: 0, medium: 0, low: 0, unbanded: 0,
  }))
  const topChanges: TopChange[] = []
  let subio = 0, seMantuvo = 0, bajo = 0

  for (const f of p.findings) {
    const sg = scoreGroupOf.get(f.finding_id)!
    const ag = f.group
    matrix[sg - 1][ag - 1]++
    cellIds[sg - 1][ag - 1].push(f.finding_id)
    if (ag < sg) subio++
    else if (ag > sg) bajo++
    else seMantuvo++
    const band: Band = (currentScoreDetails(f).band as Band | null) ?? 'unbanded'
    bandByGroup[ag - 1][band]++
    if (sg !== ag) {
      const agGroup = groups[ag - 1]
      topChanges.push({
        findingId: f.finding_id,
        cveId: f.cve_id,
        component: f.component,
        scoreGroup: sg,
        agentGroup: ag,
        delta: Math.abs(sg - ag),
        agentGroupTitle: agGroup.title,
      })
    }
  }

  topChanges.sort((a, b) => b.delta - a.delta || a.scoreGroup - b.scoreGroup)

  return { groups, matrix, cellIds, rankRanges, subio, seMantuvo, bajo, total: p.findings.length, bandByGroup, topChanges }
}
