import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Schemas } from './schemas'
import type { Override } from './schemas'

export type TacticCount = Override<
  Schemas['TacticCountResponse'],
  {
    critical: number
    high: number
    medium: number
    low: number
    unbanded: number
  }
>

export type TechniqueCount = Schemas['TechniqueCountResponse']
type CoverageData = Schemas['CoverageResponse']

export interface AttackMatrixData {
  coverage: CoverageData
  tactics: TacticCount[]
  techniques: TechniqueCount[]
}

export function useAttackMatrixQuery(role: string) {
  return useQuery({
    queryKey: ['findings-attack-matrix', role],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '10' })
      if (role) params.set('role', role)
      return api.get<AttackMatrixData>(`/findings/attack-matrix?${params}`)
    },
  })
}
