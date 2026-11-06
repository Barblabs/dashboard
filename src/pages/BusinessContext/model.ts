import type { BusinessContextFields, CriticalService } from '../../api/businessContext'

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

type Section = keyof BusinessContextFields

function valueAt(fields: BusinessContextFields, path: string): unknown {
  const [section, field] = path.split('.') as [Section, string]
  return (fields[section] as Record<string, unknown> | undefined)?.[field]
}

function stated(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  return typeof value === 'string' && value.trim() !== ''
}

/** Whether the field at a path such as `profile.sectors` says anything. */
export function isStated(fields: BusinessContextFields, path: string): boolean {
  return stated(valueAt(fields, path))
}

function sameEntry(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function union<T extends string>(current: T[], extra: T[]): T[] {
  const out = [...current]
  for (const entry of extra) {
    if (!out.some((e) => sameEntry(e, entry))) out.push(entry)
  }
  return out
}

function mergeServices(current: CriticalService[], extra: CriticalService[]): CriticalService[] {
  const out = current.map((s) => ({ ...s, assets: [...s.assets] }))
  for (const service of extra) {
    const same = out.find((s) => sameEntry(s.name, service.name))
    if (!same) {
      out.push({ ...service, assets: [...service.assets] })
      continue
    }
    if (same.description.trim() === '') same.description = service.description
    if (same.impact === '') same.impact = service.impact
    if (same.max_downtime === '') same.max_downtime = service.max_downtime
    same.assets = union(same.assets, service.assets)
  }
  return out
}

export interface Merge {
  fields: BusinessContextFields
  /** Paths, such as `profile.sectors`, that the draft added something to. */
  filled: string[]
}

/*
 * Adds a draft to what the form holds without losing anything typed: a draft fills empty text
 * and codes, and adds to lists what they do not have yet, regardless of case.
 */
export function mergeDraft(current: BusinessContextFields, draft: BusinessContextFields): Merge {
  const fields = structuredClone(current)
  const filled: string[] = []
  for (const section of Object.keys(fields) as Section[]) {
    const target = fields[section] as Record<string, unknown>
    const source = draft[section] as Record<string, unknown>
    for (const key of Object.keys(target)) {
      const before = target[key]
      const offered = source[key]
      let after = before
      if (key === 'critical_services') {
        after = mergeServices(before as CriticalService[], offered as CriticalService[])
      } else if (Array.isArray(before)) {
        after = union(before as string[], offered as string[])
      } else if (!stated(before) && stated(offered)) {
        after = offered
      }
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        target[key] = after
        filled.push(`${section}.${key}`)
      }
    }
  }
  return { fields, filled }
}

/** ISO 3166-1 alpha-2, as the backend accepts them. */
export const COUNTRIES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ
BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG
EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU
ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV
LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU
NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN
SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI
VN VU WF WS YE YT ZA ZM ZW`.split(/\s+/)

export function countryNamer(language: string): (code: string) => string {
  const names = new Intl.DisplayNames([language], { type: 'region', fallback: 'code' })
  return (code) => names.of(code) ?? code
}

const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/

/** The host of a domain or URL as the backend stores it, or `null` when it is none. */
export function canonicalDomain(entry: string): string | null {
  const host = entry
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]!
    .replace(/\.$/, '')
    .replace(/^www\./, '')
  return host.length <= 253 && DOMAIN.test(host) ? host : null
}
