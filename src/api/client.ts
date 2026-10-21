import type { AssetsResponse } from './types'

const BASE_URL = import.meta.env.VITE_API_URL as string

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${path}`)
  }
  return res.json() as Promise<T>
}

export function fetchAssets(): Promise<AssetsResponse> {
  return get<AssetsResponse>('/assets')
}
