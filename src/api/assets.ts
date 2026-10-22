import { apiClient } from './client'
import type { AssetsResponse } from './types'

export async function fetchAssets(): Promise<AssetsResponse> {
  const { data } = await apiClient.get<AssetsResponse>('/assets')
  return data
}
