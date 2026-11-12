import {
  isStatedValue,
  type BusinessContextFields,
  type CriticalService,
  type FieldPath,
  type Section,
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
  /** The fields the draft added something to. */
  filled: FieldPath[]
}

/*
 * Adds a draft to what the form holds without losing anything typed: a draft fills empty text
 * and codes, and adds to lists what they do not have yet, regardless of case.
 */
export function mergeDraft(current: BusinessContextFields, draft: BusinessContextFields): Merge {
  const fields = structuredClone(current)
  const filled: FieldPath[] = []
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
      } else if (!isStatedValue(before) && isStatedValue(offered)) {
        after = offered
      }
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        target[key] = after
        filled.push(`${section}.${key}` as FieldPath)
      }
    }
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
    .split('/')[0]!
    .replace(/\.$/, '')
    .replace(/^www\./, '')
  return host.length <= 253 && DOMAIN.test(host) ? host : null
}
