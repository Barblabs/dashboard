import { api } from './client'
import type { MeResponse } from './generated'

export function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/me')
}
