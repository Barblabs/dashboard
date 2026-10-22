import type { CmdbConnection, CmdbTestResult } from './types'
import {
  mockGetConnection,
  mockTestConnection,
  mockConnect,
  mockDisconnect,
  mockSyncNow,
} from '../mocks/cmdb'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const BASE = import.meta.env.VITE_API_URL as string

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`)
  return res.json() as Promise<T>
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`)
  return res.json() as Promise<T>
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`)
}

export function getConnection(): Promise<CmdbConnection | null> {
  if (useMock) return mockGetConnection()
  return apiGet<CmdbConnection | null>('/cmdb/connection')
}

export function testConnection(
  url: string,
  user: string,
  password: string,
): Promise<CmdbTestResult> {
  if (useMock) return mockTestConnection(url, user, password)
  return apiPost<CmdbTestResult>('/cmdb/test', { url, user, password })
}

export function connect(
  url: string,
  user: string,
  password: string,
): Promise<void> {
  if (useMock) return mockConnect(url, user, password)
  return apiPost('/cmdb/connect', { url, user, password })
}

export function disconnect(): Promise<void> {
  if (useMock) return mockDisconnect()
  return apiDelete('/cmdb/connection')
}

export function syncNow(): Promise<void> {
  if (useMock) return mockSyncNow()
  return apiPost('/cmdb/sync', {})
}
