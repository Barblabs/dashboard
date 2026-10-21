/* ── Asset inventory ───────────────────────────────────── */

export type AssetKind =
  | 'Server'
  | 'Virtual Machine'
  | 'Workstation'
  | 'Network Device'

export type Criticality = 'High' | 'Medium' | 'Low' | 'Unknown'

export type SoftwareRole = 'Operating System' | 'Application'

export interface Product {
  vendor: string
  name: string
}

export interface SoftwareComponent {
  role: SoftwareRole
  name: string
  version: string
  product: Product | null
}

export interface Hardware {
  vendor: string
  model: string
}

export interface Asset {
  record_id: string
  name: string
  description: string
  kind: AssetKind
  hardware: Hardware | null
  software: SoftwareComponent[]
  criticality: Criticality
  owner: string | null
  active: boolean
}

export interface AssetsResponse {
  assets: Asset[]
}

/* ── CMDB connection ───────────────────────────────────── */

export interface CmdbConnection {
  provider: 'itop'
  url: string
  user: string
  lastSync: string | null
}

export interface CmdbTestResult {
  ok: boolean
  error?: string
}

export interface CmdbProvider {
  id: string
  name: string
  description: string
  initial: string
  available: boolean
}
