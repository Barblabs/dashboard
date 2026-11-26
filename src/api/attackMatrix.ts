import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import { findingsStatsScopeKey } from './findingsSummary'
import type { Override, Schemas } from './schemas'

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

/** Every Technique role together: the Threats tab shows the whole matrix. */
export function useAttackMatrixQuery() {
  return useQuery({
    queryKey: [...findingsStatsScopeKey, 'attack-matrix'],
    queryFn: () => api.get<AttackMatrixData>('/findings/attack-matrix?limit=10'),
  })
}
