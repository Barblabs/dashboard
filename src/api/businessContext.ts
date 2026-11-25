import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssetsPage } from './assets'
import { api } from './client'
import { connectionScopeKey } from './cmdb'
import { findingsStatsScopeKey } from './findingsSummary'
import { everyOf, type Known, type Override, type Schemas } from './schemas'

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

// The vocabularies, in the backend's order; `everyOf` fails `tsc` when the backend adds or drops a code.
export const SECTORS = everyOf<Sector>()([
  'agriculture', 'aerospace', 'automotive', 'chemical', 'commercial',
  'communications', 'construction', 'defense', 'education', 'energy',
  'entertainment', 'financial-services', 'government',
  'government-emergency-services', 'government-local', 'government-national',
  'government-public-services', 'government-regional', 'healthcare',
  'hospitality-leisure', 'infrastructure', 'infrastructure-dams',
  'infrastructure-nuclear', 'infrastructure-water', 'insurance',
  'manufacturing', 'mining', 'non-profit', 'pharmaceuticals', 'retail',
  'technology', 'telecommunications', 'transportation', 'utilities',
  'biotechnology', 'cryptocurrency', 'e-commerce', 'food-beverage',
  'gaming', 'legal', 'logistics', 'maritime', 'media', 'oil-gas',
  'professional-services', 'real-estate', 'research', 'semiconductors',
])

export const ORGANIZATION_TYPES = everyOf<Exclude<OrganizationType, ''>>()([
  'private_company', 'public_company', 'subsidiary', 'state_owned',
  'government', 'non_profit', 'academic', 'cooperative',
  'international_organization',
])

export const EMPLOYEE_RANGES = everyOf<Exclude<EmployeeRange, ''>>()([
  '1_9', '10_49', '50_249', '250_999', '1000_4999',
  '5000_9999', '10000_plus',
])

export const REVENUE_RANGES = everyOf<Exclude<RevenueRange, ''>>()([
  'under_1m', '1m_5m', '5m_10m', '10m_50m', '50m_100m',
  '100m_250m', '250m_1b', '1b_10b', 'over_10b',
])

export const DATA_CATEGORIES = everyOf<DataCategory>()([
  'personal_data', 'sensitive_personal_data', 'government_ids', 'payment_cards',
  'financial_data', 'tax_data', 'health_data', 'biometric_data',
  'children_data', 'employee_data', 'location_data', 'communications',
  'credentials', 'intellectual_property', 'source_code', 'research_data',
  'legal_data', 'operational_data', 'classified_information',
])

export const REGULATIONS = everyOf<Regulation>()([
  'gdpr', 'uk_gdpr', 'lfpdppp', 'lgpdppso', 'lgpd', 'habeas_data_co',
  'ley_21719_cl', 'ley_25326_ar', 'ccpa', 'pipeda', 'pci_dss', 'sox',
  'glba', 'cnbv', 'banxico', 'ley_fintech', 'cnsf', 'lfpiorpi', 'dora',
  'nydfs_500', 'swift_csp', 'sec_cyber', 'hipaa', 'hitrust',
  'nom_024_ssa3', 'nom_151', 'nis2', 'nerc_cip', 'iec_62443', 'tisax',
  'cmmc', 'fedramp', 'fisma', 'ferpa', 'coppa', 'iso_27001',
  'iso_27701', 'iso_22301', 'soc_2', 'nist_csf', 'nist_800_53',
  'cis_controls', 'cobit',
])

export const ENVIRONMENTS = everyOf<Environment>()([
  'on_premises', 'private_cloud', 'public_cloud', 'saas',
  'email_collaboration', 'erp', 'containers', 'mainframe', 'legacy_systems',
  'operational_technology', 'iot', 'public_web_apps', 'public_apis',
  'mobile_apps', 'point_of_sale', 'atms', 'branch_offices', 'remote_work',
  'byod',
])

export const CONCERNS = everyOf<Concern>()([
  'ransomware', 'data_theft', 'accidental_exposure', 'fraud',
  'business_email_compromise', 'phishing', 'social_engineering',
  'account_takeover', 'malware', 'vulnerability_exploitation', 'web_attacks',
  'espionage', 'sabotage', 'ddos', 'insider', 'supply_chain',
  'third_party_breach', 'hacktivism', 'cryptojacking',
])

export const RISK_APPETITES = everyOf<Exclude<RiskAppetite, ''>>()([
  'averse', 'minimal', 'cautious', 'open', 'eager',
])

export const IMPACTS = everyOf<Exclude<Impact, ''>>()(['critical', 'high', 'medium', 'low'])

export const DOWNTIMES = everyOf<Exclude<Downtime, ''>>()([
  'under_1h', '1h_4h', '4h_24h', '1d_3d', '3d_7d', 'over_7d',
])

/** ISO 3166-1 alpha-2, as the backend accepts them. */
export const COUNTRIES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
] as const

export type CountryCode = (typeof COUNTRIES)[number]

export type CriticalService = Known<Schemas['CriticalServiceField']>
type CriticalServiceHealthResponse = Schemas['CriticalServiceHealthResponse']

/** An open Critical is what makes a service `at_risk` or `watch`, so only those have an oldest one. */
export type CriticalServiceHealth =
  | Override<CriticalServiceHealthResponse, { status: 'at_risk' | 'watch'; oldest_critical_days: number }>
  | Override<CriticalServiceHealthResponse, { status: 'clear'; oldest_critical_days: null }>

type CriticalServiceHealthList = Override<
  Schemas['CriticalServiceHealthListResponse'],
  { critical_services: CriticalServiceHealth[] }
>

/** The `business_context/1` document. Blank text, a blank code or an empty list is "not stated". */
export interface BusinessContextFields {
  profile: Known<Schemas['ProfileFields']>
  geography: Override<
    Known<Schemas['GeographyFields']>,
    { headquarters: CountryCode | ''; countries: CountryCode[] }
  >
  operations: Override<
    Known<Schemas['OperationsFields']>,
    { critical_services: CriticalService[] }
  >
  footprint: Known<Schemas['FootprintFields']>
  risk: Known<Schemas['RiskFields']>
}

export function emptyFields(): BusinessContextFields {
  return {
    profile: {
      summary: '',
      mission: '',
      vision: '',
      sectors: [],
      organization_type: '',
      employees: '',
      annual_revenue: '',
    },
    geography: { headquarters: '', countries: [] },
    operations: { critical_services: [], data_categories: [], regulations: [], environments: [] },
    footprint: { domains: [], brands: [], technologies: [], third_parties: [] },
    risk: { appetite: '', concerns: [], past_incidents: '', constraints: '', notes: '' },
  }
}

export type Section = keyof BusinessContextFields

/** A field of the document as the backend names it in `key_fields` and `gaps`, such as `profile.sectors`. */
export type FieldPath = {
  [S in Section]: `${S}.${keyof BusinessContextFields[S] & string}`
}[Section]

function valueAt(fields: BusinessContextFields, path: FieldPath): unknown {
  for (const [section, values] of Object.entries(fields)) {
    for (const [field, value] of Object.entries(values)) {
      if (`${section}.${field}` === path) return value
    }
  }
  return undefined
}

/** Whether a field's value says anything: non-blank text, a code, or a non-empty list. */
export function isStatedValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  return typeof value === 'string' && value.trim() !== ''
}

export function isStated(fields: BusinessContextFields, path: FieldPath): boolean {
  return isStatedValue(valueAt(fields, path))
}

export type BusinessContext = Override<
  Schemas['BusinessContextResponse'],
  { context: BusinessContextFields }
>

export type Draft = Override<Schemas['DraftResponse'], { context: BusinessContextFields }>

type DraftFile = Known<Schemas['DraftFile']>

/** Pasted text, files or both; the agent reads them together. */
export type DraftSource = Override<Known<Schemas['DraftBusinessContextRequest']>, { files?: DraftFile[] }>

/*
 * A text's length as the backend measures it against `LIMITS`: in Unicode code points, as Go's
 * `utf8.RuneCountInString` counts them. A string iterates by code point, so an emoji made of
 * a surrogate pair counts once, while one built from several code points counts each.
 */
export function characterCount(text: string): number {
  let count = 0
  for (const _ of text) count++
  return count
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

export type SaveBusinessContext = ReturnType<typeof useSaveBusinessContextMutation>

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
    reader.addEventListener('load', () => {
      // `readAsDataURL` always ends in a string; `ArrayBuffer` is what `readAsArrayBuffer` gives.
      const { result } = reader
      if (typeof result === 'string') resolve(result.split(',', 2)[1] ?? '')
      else reject(new Error('read failed'))
    })
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

const DRAFT_KEY = ['business-context', 'draft'] as const

/** Whether a draft is being generated, seen from outside the component that started it. */
export function useIsDraftingBusinessContext() {
  return useIsMutating({ mutationKey: DRAFT_KEY }) > 0
}

/*
 * Reading the files is part of the mutation, so it is pending from the click on: a
 * large document cannot be sent twice while it is still being read.
 */
export function useDraftBusinessContextMutation() {
  return useMutation({
    mutationKey: DRAFT_KEY,
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
  })
}

export function useCriticalServicesQuery() {
  return useQuery({
    queryKey: [...findingsStatsScopeKey, 'critical-services'],
    queryFn: async () =>
      (await api.get<CriticalServiceHealthList>('/critical-services')).critical_services,
  })
}
