import { z } from 'zod'
import {
  CONCERNS,
  COUNTRIES,
  DATA_CATEGORIES,
  EMPLOYEE_RANGES,
  ENVIRONMENTS,
  LIMITS,
  ORGANIZATION_TYPES,
  REGULATIONS,
  REVENUE_RANGES,
  DOWNTIMES,
  IMPACTS,
  RISK_APPETITES,
  SECTORS,
} from '../../api/businessContext'

// Messages are translation keys; the field passes the limit that applies.
const TOO_LONG = 'businessContext.validation.tooLong'
const TOO_MANY = 'businessContext.validation.tooMany'
const SERVICE_NAME = 'businessContext.validation.serviceName'
const SERVICE_NAME_TAKEN = 'businessContext.validation.serviceNameTaken'

export type ValidationKey = typeof TOO_LONG | typeof TOO_MANY | typeof SERVICE_NAME | typeof SERVICE_NAME_TAKEN

// The backend counts characters after trimming, as the user reads them.
const text = (max: number) => z.string().refine((s) => [...s.trim()].length <= max, TOO_LONG)
const entries = z.array(z.string()).max(LIMITS.entries, TOO_MANY)

function oneOf<T extends string>(codes: readonly T[]) {
  return z.array(z.enum(codes as [T, ...T[]]))
}

function optional<T extends string>(codes: readonly T[]) {
  return z.enum(['', ...codes] as ['' | T, ...('' | T)[]])
}

const service = z.object({
  name: z.string().trim().min(1, SERVICE_NAME).pipe(text(LIMITS.entry)),
  description: text(LIMITS.statement),
  impact: optional(IMPACTS),
  max_downtime: optional(DOWNTIMES),
  assets: entries,
})

export const businessContextSchema = z.object({
  profile: z.object({
    summary: text(LIMITS.summary),
    mission: text(LIMITS.statement),
    vision: text(LIMITS.statement),
    sectors: oneOf(SECTORS),
    organization_type: optional(ORGANIZATION_TYPES),
    employees: optional(EMPLOYEE_RANGES),
    annual_revenue: optional(REVENUE_RANGES),
  }),
  geography: z.object({
    headquarters: optional(COUNTRIES),
    countries: oneOf(COUNTRIES).max(LIMITS.entries, TOO_MANY),
  }),
  operations: z.object({
    critical_services: z
      .array(service)
      .max(LIMITS.services, TOO_MANY)
      .superRefine((services, ctx) => {
        const seen = new Set<string>()
        services.forEach((s, i) => {
          const key = s.name.trim().toLowerCase()
          if (key && seen.has(key)) ctx.addIssue({ code: 'custom', path: [i, 'name'], message: SERVICE_NAME_TAKEN })
          seen.add(key)
        })
      }),
    data_categories: oneOf(DATA_CATEGORIES),
    regulations: oneOf(REGULATIONS),
    environments: oneOf(ENVIRONMENTS),
  }),
  footprint: z.object({
    domains: entries,
    brands: entries,
    technologies: entries,
    third_parties: entries,
  }),
  risk: z.object({
    appetite: optional(RISK_APPETITES),
    concerns: oneOf(CONCERNS),
    past_incidents: text(LIMITS.narrative),
    constraints: text(LIMITS.narrative),
    notes: text(LIMITS.narrative),
  }),
})
