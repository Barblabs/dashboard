import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssetsPage } from './assets'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import type { components } from './generated'

type Schemas = components['schemas']

export type Sector = Schemas['ProfileFields']['sectors'][number]
export type OrganizationType = Schemas['ProfileFields']['organization_type']
export type EmployeeRange = Schemas['ProfileFields']['employees']
export type RevenueRange = Schemas['ProfileFields']['annual_revenue']
export type DataCategory = Schemas['OperationsFields']['data_categories'][number]
export type Regulation = Schemas['OperationsFields']['regulations'][number]
export type Environment = Schemas['OperationsFields']['environments'][number]
export type Concern = Schemas['RiskFields']['concerns'][number]
export type RiskAppetite = Schemas['RiskFields']['appetite']
export type Impact = Schemas['CriticalServiceField']['impact']
export type Downtime = Schemas['CriticalServiceField']['max_downtime']

/*
 * The vocabularies, in the backend's order. Each is a Record so `tsc` fails when the backend
 * adds or drops a code and generated.ts is regenerated.
 */
function codes<T extends string>(record: Record<T, true>): T[] {
  return Object.keys(record) as T[]
}

export const SECTORS = codes<Sector>({
  agriculture: true, aerospace: true, automotive: true, chemical: true, commercial: true,
  communications: true, construction: true, defense: true, education: true, energy: true,
  entertainment: true, 'financial-services': true, government: true,
  'government-emergency-services': true, 'government-local': true, 'government-national': true,
  'government-public-services': true, 'government-regional': true, healthcare: true,
  'hospitality-leisure': true, infrastructure: true, 'infrastructure-dams': true,
  'infrastructure-nuclear': true, 'infrastructure-water': true, insurance: true,
  manufacturing: true, mining: true, 'non-profit': true, pharmaceuticals: true, retail: true,
  technology: true, telecommunications: true, transportation: true, utilities: true,
  biotechnology: true, cryptocurrency: true, 'e-commerce': true, 'food-beverage': true,
  gaming: true, legal: true, logistics: true, maritime: true, media: true, 'oil-gas': true,
  'professional-services': true, 'real-estate': true, research: true, semiconductors: true,
})

export const ORGANIZATION_TYPES = codes<Exclude<OrganizationType, ''>>({
  private_company: true, public_company: true, subsidiary: true, state_owned: true,
  government: true, non_profit: true, academic: true, cooperative: true,
  international_organization: true,
})

export const EMPLOYEE_RANGES = codes<Exclude<EmployeeRange, ''>>({
  '1_9': true, '10_49': true, '50_249': true, '250_999': true, '1000_4999': true,
  '5000_9999': true, '10000_plus': true,
})

export const REVENUE_RANGES = codes<Exclude<RevenueRange, ''>>({
  under_1m: true, '1m_5m': true, '5m_10m': true, '10m_50m': true, '50m_100m': true,
  '100m_250m': true, '250m_1b': true, '1b_10b': true, over_10b: true,
})

export const DATA_CATEGORIES = codes<DataCategory>({
  personal_data: true, sensitive_personal_data: true, government_ids: true, payment_cards: true,
  financial_data: true, tax_data: true, health_data: true, biometric_data: true,
  children_data: true, employee_data: true, location_data: true, communications: true,
  credentials: true, intellectual_property: true, source_code: true, research_data: true,
  legal_data: true, operational_data: true, classified_information: true,
})

export const REGULATIONS = codes<Regulation>({
  gdpr: true, uk_gdpr: true, lfpdppp: true, lgpdppso: true, lgpd: true, habeas_data_co: true,
  ley_21719_cl: true, ley_25326_ar: true, ccpa: true, pipeda: true, pci_dss: true, sox: true,
  glba: true, cnbv: true, banxico: true, ley_fintech: true, cnsf: true, lfpiorpi: true, dora: true,
  nydfs_500: true, swift_csp: true, sec_cyber: true, hipaa: true, hitrust: true,
  nom_024_ssa3: true, nom_151: true, nis2: true, nerc_cip: true, iec_62443: true, tisax: true,
  cmmc: true, fedramp: true, fisma: true, ferpa: true, coppa: true, iso_27001: true,
  iso_27701: true, iso_22301: true, soc_2: true, nist_csf: true, nist_800_53: true,
  cis_controls: true, cobit: true,
})

export const ENVIRONMENTS = codes<Environment>({
  on_premises: true, private_cloud: true, public_cloud: true, saas: true,
  email_collaboration: true, erp: true, containers: true, mainframe: true, legacy_systems: true,
  operational_technology: true, iot: true, public_web_apps: true, public_apis: true,
  mobile_apps: true, point_of_sale: true, atms: true, branch_offices: true, remote_work: true,
  byod: true,
})

export const CONCERNS = codes<Concern>({
  ransomware: true, data_theft: true, accidental_exposure: true, fraud: true,
  business_email_compromise: true, phishing: true, social_engineering: true,
  account_takeover: true, malware: true, vulnerability_exploitation: true, web_attacks: true,
  espionage: true, sabotage: true, ddos: true, insider: true, supply_chain: true,
  third_party_breach: true, hacktivism: true, cryptojacking: true,
})

export const RISK_APPETITES = codes<Exclude<RiskAppetite, ''>>({
  averse: true, minimal: true, cautious: true, open: true, eager: true,
})

export const IMPACTS = codes<Exclude<Impact, ''>>({ critical: true, high: true, medium: true, low: true })

export const DOWNTIMES = codes<Exclude<Downtime, ''>>({
  under_1h: true, '1h_4h': true, '4h_24h': true, '1d_3d': true, '3d_7d': true, over_7d: true,
})

export interface CriticalService {
  name: string
  description: string
  /** How badly losing it hurts. */
  impact: Impact
  /** How long it can be down before the harm is unacceptable. */
  max_downtime: Downtime
  /** Names of the Assets that run it, as the CMDB writes them. */
  assets: string[]
}

/** The `business_context/1` document. Blank text, a blank code or an empty list is "not stated". */
export interface BusinessContextFields {
  profile: {
    summary: string
    mission: string
    vision: string
    sectors: Sector[]
    organization_type: OrganizationType
    employees: EmployeeRange
    annual_revenue: RevenueRange
  }
  geography: {
    /** ISO 3166-1 alpha-2. */
    headquarters: string
    countries: string[]
  }
  operations: {
    critical_services: CriticalService[]
    data_categories: DataCategory[]
    regulations: Regulation[]
    environments: Environment[]
  }
  footprint: {
    domains: string[]
    brands: string[]
    technologies: string[]
    third_parties: string[]
  }
  risk: {
    appetite: RiskAppetite
    concerns: Concern[]
    past_incidents: string
    constraints: string
    notes: string
  }
}

export interface BusinessContext {
  /** 0 until a Customer Admin saves one; a save sends back the version it read. */
  version: number
  saved_at: string | null
  saved_by: string | null
  context: BusinessContextFields
  /** Paths such as `profile.sectors`: what the Agents need most. */
  key_fields: string[]
  gaps: string[]
}

export interface Draft {
  context: BusinessContextFields
  gaps: string[]
}

export interface DraftFile {
  name: string
  media_type: string
  /** The file's bytes in base64. */
  data: string
}

/** Pasted text, files or both; the agent reads them together. */
export interface DraftSource {
  text?: string
  files?: DraftFile[]
}

/** Mirrors the backend's limits, so the form flags them before a save is refused. */
export const LIMITS = {
  summary: 2000,
  statement: 1000,
  narrative: 4000,
  entry: 200,
  entries: 50,
  services: 25,
  documents: 10,
  documentBytes: 10 * 1024 * 1024,
  documentsBytes: 20 * 1024 * 1024,
} as const

const BUSINESS_CONTEXT_KEY = ['business-context'] as const

export function useBusinessContextQuery() {
  return useQuery({
    queryKey: BUSINESS_CONTEXT_KEY,
    queryFn: () => api.get<BusinessContext>('/business-context'),
    retry: false,
  })
}

export function useSaveBusinessContextMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { version: number; context: BusinessContextFields }) =>
      api.put<BusinessContext>('/business-context', data),
    onSuccess: (saved) => queryClient.setQueryData(BUSINESS_CONTEXT_KEY, saved),
  })
}

// Browsers often send no type for Markdown or CSV, so the extension decides.
const DRAFT_MEDIA_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
}

export const DRAFT_FILE_EXTENSIONS = Object.keys(DRAFT_MEDIA_TYPES)

/** `null` for a file the draft cannot read. */
export function draftMediaTypeOf(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return DRAFT_MEDIA_TYPES[ext] ?? null
}

// The backend takes the bytes in base64, which is what a data URL carries after its comma.
function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result).split(',', 2)[1] ?? ''))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('read failed')))
    reader.readAsDataURL(file)
  })
}

async function draftSourceOf(text: string, files: File[]): Promise<DraftSource> {
  const encoded = await Promise.all(
    files.map(async (file): Promise<DraftFile> => ({
      name: file.name,
      media_type: draftMediaTypeOf(file) ?? 'application/octet-stream',
      data: await readBase64(file),
    })),
  )
  return { ...(text.trim() ? { text } : {}), ...(encoded.length > 0 ? { files: encoded } : {}) }
}

/*
 * Reading the files is part of the mutation, so it is pending from the click on: a
 * large document cannot be sent twice while it is still being read.
 */
export function useDraftBusinessContextMutation() {
  return useMutation({
    mutationFn: async ({ text, files }: { text: string; files: File[] }) =>
      api.post<Draft>('/business-context/draft', await draftSourceOf(text, files)),
  })
}

const ASSET_SUGGESTIONS = 200

// Suggestions only: without a connected CMDB there are none, and a failure is not shown.
export function useAssetNamesQuery() {
  return useQuery({
    queryKey: [...connectionScopeKey, 'asset-names'],
    queryFn: () => api.get<AssetsPage>(`/assets?limit=${ASSET_SUGGESTIONS}&active=true`),
    select: (page) => page.assets.map((a) => a.name),
    retry: false,
  })
}
