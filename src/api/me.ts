import { api } from './client'
import type { Schemas } from './schemas'

export type MeResponse = Schemas['MeResponse']

export function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/me')
}
