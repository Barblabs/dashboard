import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import { findingsStatsScopeKey } from './findingsSummary'
import type { Schemas } from './schemas'
import type { Override } from './schemas'

// Band counts come from an embedded Go struct not reflected in the OpenAPI spec.
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

export type AttackMatrixData = Override<
  Schemas['AttackMatrixResponse'],
  { tactics: TacticCount[] }
>

export function useAttackMatrixQuery(role: string) {
  return useQuery({
    queryKey: [...findingsStatsScopeKey, 'attack-matrix', role],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '10' })
      if (role) params.set('role', role)
      return api.get<AttackMatrixData>(`/findings/attack-matrix?${params}`)
    },
  })
}
