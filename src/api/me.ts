import { api } from './client'
import type { components } from './generated'

type MeResponse = components['schemas']['MeResponse']

export function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/me')
}
