import { apiClient } from './client'
import type {
  CmdbConnection,
  CmdbCredentials,
  CmdbSyncResult,
  CmdbTestResult,
} from './types'

export async function getConnection(): Promise<CmdbConnection | null> {
  const { data } = await apiClient.get<CmdbConnection | null>('/cmdb/connection')
  return data
}

export async function testConnection(credentials: CmdbCredentials): Promise<CmdbTestResult> {
  const { data } = await apiClient.post<CmdbTestResult>('/cmdb/test', credentials)
  return data
}

export async function connect(credentials: CmdbCredentials): Promise<CmdbConnection> {
  const { data } = await apiClient.post<CmdbConnection>('/cmdb/connect', credentials)
  return data
}

export async function syncNow(): Promise<CmdbSyncResult> {
  const { data } = await apiClient.post<CmdbSyncResult>('/cmdb/sync', {})
  return data
}

export async function disconnect(): Promise<void> {
  await apiClient.delete('/cmdb/connection')
}
