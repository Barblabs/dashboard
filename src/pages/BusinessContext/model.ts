import {
  isStatedValue,
  type BusinessContextFields,
  type CriticalService,
  type FieldPath,
} from '../../api/businessContext'

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
  filled: FieldPath[]
}

/*
 * Adds a draft to what the form holds without losing anything typed: a draft fills empty text
 * and codes, and adds to lists what they do not have yet, regardless of case. Every field is
 * listed, so `tsc` fails here when the document gains or loses one.
 */
export function mergeDraft(current: BusinessContextFields, draft: BusinessContextFields): Merge {
  const filled: FieldPath[] = []
  function note<T>(path: FieldPath, before: T, after: T): T {
    if (JSON.stringify(after) !== JSON.stringify(before)) filled.push(path)
    return after
  }
  const text = <T extends string>(path: FieldPath, before: T, offered: T) =>
    note(path, before, !isStatedValue(before) && isStatedValue(offered) ? offered : before)
  const list = <T extends string>(path: FieldPath, before: T[], offered: T[]) =>
    note(path, before, union(before, offered))

  const { profile, geography, operations, footprint, risk } = current
  const fields: BusinessContextFields = {
    profile: {
      summary: text('profile.summary', profile.summary, draft.profile.summary),
      mission: text('profile.mission', profile.mission, draft.profile.mission),
      vision: text('profile.vision', profile.vision, draft.profile.vision),
      sectors: list('profile.sectors', profile.sectors, draft.profile.sectors),
      organization_type: text('profile.organization_type', profile.organization_type, draft.profile.organization_type),
      employees: text('profile.employees', profile.employees, draft.profile.employees),
      annual_revenue: text('profile.annual_revenue', profile.annual_revenue, draft.profile.annual_revenue),
    },
    geography: {
      headquarters: text('geography.headquarters', geography.headquarters, draft.geography.headquarters),
      countries: list('geography.countries', geography.countries, draft.geography.countries),
    },
    operations: {
      critical_services: note(
        'operations.critical_services',
        operations.critical_services,
        mergeServices(operations.critical_services, draft.operations.critical_services),
      ),
      data_categories: list('operations.data_categories', operations.data_categories, draft.operations.data_categories),
      regulations: list('operations.regulations', operations.regulations, draft.operations.regulations),
      environments: list('operations.environments', operations.environments, draft.operations.environments),
    },
    footprint: {
      domains: list('footprint.domains', footprint.domains, draft.footprint.domains),
      brands: list('footprint.brands', footprint.brands, draft.footprint.brands),
      technologies: list('footprint.technologies', footprint.technologies, draft.footprint.technologies),
      third_parties: list('footprint.third_parties', footprint.third_parties, draft.footprint.third_parties),
    },
    risk: {
      appetite: text('risk.appetite', risk.appetite, draft.risk.appetite),
      concerns: list('risk.concerns', risk.concerns, draft.risk.concerns),
      past_incidents: text('risk.past_incidents', risk.past_incidents, draft.risk.past_incidents),
      constraints: text('risk.constraints', risk.constraints, draft.risk.constraints),
      notes: text('risk.notes', risk.notes, draft.risk.notes),
    },
  }
  return { fields, filled }
}

const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/

/** The host of a domain or URL as the backend stores it, or `null` when it is none. */
export function canonicalDomain(entry: string): string | null {
  const host = entry
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split('/')[0]
    .replace(/\.$/, '')
    .replace(/^www\./, '')
  return host.length <= 253 && DOMAIN.test(host) ? host : null
}
