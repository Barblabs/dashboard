/* eslint-disable typescript/no-unsafe-type-assertion */
import { describe, expect, it } from 'vitest'
import type { Finding, PriorityGroup } from '../../api/prioritizations'
import { buildMatrix } from './beforeAfterAlgorithm'

// Minimal finding stub — only the fields buildMatrix touches.
function f(
  id: string,
  rank: number,
  agentGroup: number,
  band: 'critical' | 'high' | 'medium' | 'low' | null = null,
): Finding {
  return {
    finding_id: id,
    score_rank: rank,
    group: agentGroup,
    cve_id: `CVE-0000-${id}`,
    component: id,
    current: {
      score_details: {
        value: 0,
        band,
        data_gaps: [],
        factors: {} as never,
      },
      asset: {} as never,
      score: 0,
    },
  } as unknown as Finding
}

function g(position: number, ids: string[]): PriorityGroup {
  return { position, finding_ids: ids, title: `G${position}`, reason: `reason${position}` } as PriorityGroup
}

function p(findings: Finding[], groups: PriorityGroup[]) {
  return { findings, groups } as never
}

describe('buildMatrix', () => {
  describe('N=1 — single group, all findings stay', () => {
    it('all 3 findings stay, matrix is [[3]], subio=0 bajo=0', () => {
      const findings = [f('a', 1, 1), f('b', 2, 1), f('c', 3, 1)]
      const groups = [g(1, ['a', 'b', 'c'])]
      const r = buildMatrix(p(findings, groups))

      expect(r.matrix).toEqual([[3]])
      expect(r.subio).toBe(0)
      expect(r.bajo).toBe(0)
      expect(r.seMantuvo).toBe(3)
      expect(r.total).toBe(3)
      expect(r.topChanges).toHaveLength(0)
    })
  })

  describe('N=4 — four groups with known movements', () => {
    // SG1 (ranks 1-4): a,b,c,d  — SG2 (ranks 5-8): e,f,g,h
    // SG3 (ranks 9-12): i,j,k,l — SG4 (ranks 13-16): m,n,o,p
    // Agent groups:
    //   G1: a,b,c,e  (e went up from SG2→G1, so subio++)
    //   G2: d,f,g,h  (d went down from SG1→G2, so bajo++)
    //   G3: i,j,k,l
    //   G4: m,n,o,p
    const findings = [
      f('a', 1, 1), f('b', 2, 1), f('c', 3, 1), f('d', 4, 2), // d: SG1 → G2 (bajo)
      f('e', 5, 1), f('f', 6, 2), f('g', 7, 2), f('h', 8, 2), // e: SG2 → G1 (subio)
      f('i', 9, 3), f('j', 10, 3), f('k', 11, 3), f('l', 12, 3),
      f('m', 13, 4), f('n', 14, 4), f('o', 15, 4), f('p', 16, 4),
    ]
    const groups = [
      g(1, ['a', 'b', 'c', 'e']),
      g(2, ['d', 'f', 'g', 'h']),
      g(3, ['i', 'j', 'k', 'l']),
      g(4, ['m', 'n', 'o', 'p']),
    ]

    it('counts every finding in the cell of its score group and agent group', () => {
      const r = buildMatrix(p(findings, groups))
      expect(r.matrix).toEqual([
        [3, 1, 0, 0],
        [1, 3, 0, 0],
        [0, 0, 4, 0],
        [0, 0, 0, 4],
      ])
      expect(r.cellIds[0][1]).toEqual(['d'])
      expect(r.cellIds[1][0]).toEqual(['e'])
    })

    it('counts what went up, stayed and went down', () => {
      const r = buildMatrix(p(findings, groups))
      expect(r.subio).toBe(1)
      expect(r.bajo).toBe(1)
      expect(r.seMantuvo).toBe(14)
    })
  })

  it('lists the biggest moves first, then by score group', () => {
    const findings = [f('d', 4, 3), f('c', 3, 2), f('b', 2, 1), f('a', 1, 4)]
    const groups = [g(1, ['b']), g(2, ['c']), g(3, ['d']), g(4, ['a'])]
    const r = buildMatrix(p(findings, groups))

    expect(r.topChanges.map((c) => [c.findingId, c.delta])).toEqual([
      ['a', 3],
      ['b', 1],
      ['c', 1],
      ['d', 1],
    ])
  })

  describe('N=8 — one swap per pair', () => {
    // 8 groups of 2 findings each; one finding swaps with the next group
    // G1: a1(rank1),a2(rank2) — a2 swaps to G2
    // G2: b1(rank3),b2(rank4) — b1 swaps to G1
    // G3–G8 all stay
    const findings = [
      f('a1', 1, 1), f('a2', 2, 2), // a2: SG1→G2 bajo
      f('b1', 3, 1), f('b2', 4, 2), // b1: SG2→G1 subio
      f('c1', 5, 3), f('c2', 6, 3),
      f('d1', 7, 4), f('d2', 8, 4),
      f('e1', 9, 5), f('e2', 10, 5),
      f('f1', 11, 6), f('f2', 12, 6),
      f('g1', 13, 7), f('g2', 14, 7),
      f('h1', 15, 8), f('h2', 16, 8),
    ]
    const groups = [
      g(1, ['a1', 'b1']), g(2, ['a2', 'b2']),
      g(3, ['c1', 'c2']), g(4, ['d1', 'd2']),
      g(5, ['e1', 'e2']), g(6, ['f1', 'f2']),
      g(7, ['g1', 'g2']), g(8, ['h1', 'h2']),
    ]

    it('matrix is 8×8', () => {
      const r = buildMatrix(p(findings, groups))
      expect(r.matrix).toHaveLength(8)
      expect(r.matrix[0]).toHaveLength(8)
    })

    it('rank ranges are correct', () => {
      const r = buildMatrix(p(findings, groups))
      expect(r.rankRanges[0]).toEqual([1, 2])
      expect(r.rankRanges[7]).toEqual([15, 16])
    })
  })

  describe('score_rank ties', () => {
    it('two findings with equal rank both land in SG1', () => {
      // x and y both have score_rank=1; they will both sort to positions 0 and 1
      // so they both get assigned scoreGroup=1 (SG1 covers the first 2 findings)
      const findings = [f('x', 1, 1), f('y', 1, 1), f('z', 2, 2)]
      const groups = [g(1, ['x', 'y']), g(2, ['z'])]
      const r = buildMatrix(p(findings, groups))

      // x and y stay in G1; z stays in G2
      expect(r.seMantuvo).toBe(3)
    })
  })
})
