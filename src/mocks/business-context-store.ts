import { z, type ZodType } from 'zod'
import {
  CONCERNS,
  COUNTRIES,
  DATA_CATEGORIES,
  DOWNTIMES,
  EMPLOYEE_RANGES,
  emptyFields,
  ENVIRONMENTS,
  IMPACTS,
  ORGANIZATION_TYPES,
  REGULATIONS,
  REVENUE_RANGES,
  RISK_APPETITES,
  SECTORS,
  type BusinessContext,
  type BusinessContextFields,
  type FieldPath,
} from '../api/businessContext'
import { localStore } from './localStore'

export const KEY_FIELDS: FieldPath[] = [
  'profile.summary',
  'profile.sectors',
  'profile.employees',
  'profile.annual_revenue',
  'geography.countries',
  'operations.critical_services',
  'operations.data_categories',
  'footprint.domains',
  'footprint.technologies',
  'risk.appetite',
]

export function unsaved(): BusinessContext {
  return { version: 0, saved_at: null, saved_by: null, context: emptyFields(), key_fields: KEY_FIELDS, gaps: KEY_FIELDS }
}

// A code from the list, or blank for none.
function blankOr<T extends string>(codes: readonly T[]): z.ZodEnum<{ [K in '' | T]: K }> {
  return z.enum(['', ...codes])
}

const fieldsSchema = z.strictObject({
  profile: z.strictObject({
    summary: z.string(),
    mission: z.string(),
    vision: z.string(),
    sectors: z.array(z.enum(SECTORS)),
    organization_type: blankOr(ORGANIZATION_TYPES),
    employees: blankOr(EMPLOYEE_RANGES),
    annual_revenue: blankOr(REVENUE_RANGES),
  }),
  geography: z.strictObject({
    headquarters: blankOr(COUNTRIES),
    countries: z.array(z.enum(COUNTRIES)),
  }),
  operations: z.strictObject({
    critical_services: z.array(
      z.strictObject({
        name: z.string(),
        description: z.string(),
        impact: blankOr(IMPACTS),
        max_downtime: blankOr(DOWNTIMES),
        assets: z.array(z.string()),
      }),
    ),
    data_categories: z.array(z.enum(DATA_CATEGORIES)),
    regulations: z.array(z.enum(REGULATIONS)),
    environments: z.array(z.enum(ENVIRONMENTS)),
  }),
  footprint: z.strictObject({
    domains: z.array(z.string()),
    brands: z.array(z.string()),
    technologies: z.array(z.string()),
    third_parties: z.array(z.string()),
  }),
  risk: z.strictObject({
    appetite: blankOr(RISK_APPETITES),
    concerns: z.array(z.enum(CONCERNS)),
    past_incidents: z.string(),
    constraints: z.string(),
    notes: z.string(),
  }),
}) satisfies ZodType<BusinessContextFields>

const businessContextSchema = z.strictObject({
  version: z.number().int(),
  saved_at: z.string().nullable(),
  saved_by: z.string().nullable(),
  context: fieldsSchema,
  key_fields: z.array(z.string()),
  gaps: z.array(z.string()),
}) satisfies ZodType<BusinessContext>

export const businessContextStore = localStore('barbattack_mock_business_context', businessContextSchema, unsaved())

/** What the Drafter answers in mock mode, whatever the document. */
export const MOCK_DRAFT: BusinessContextFields = {
  profile: {
    summary:
      'ACME Corp opera una plataforma de pagos en línea y una tienda de comercio electrónico para pequeños comercios en México y Colombia.',
    mission: 'Que cualquier comercio pueda cobrar en línea de forma segura.',
    vision: '',
    sectors: ['financial-services', 'retail'],
    organization_type: 'private_company',
    employees: '250_999',
    annual_revenue: '100m_250m',
  },
  geography: { headquarters: 'MX', countries: ['MX', 'CO'] },
  operations: {
    critical_services: [
      {
        name: 'Pagos en línea',
        description: 'Autoriza y liquida los cobros con tarjeta de los comercios.',
        impact: 'critical',
        max_downtime: 'under_1h',
        assets: ['prod-api-01'],
      },
      {
        name: 'Facturación',
        description: 'Emite las facturas electrónicas de cada cobro.',
        impact: 'high',
        max_downtime: '4h_24h',
        assets: ['erp-app-02'],
      },
      {
        name: 'Nómina',
        description: 'Paga a los empleados cada quincena.',
        impact: 'high',
        max_downtime: '1d_3d',
        assets: ['crm-db-primary', 'nomina-legacy', 'hr-portal'],
      },
    ],
    data_categories: ['payment_cards', 'personal_data', 'financial_data', 'employee_data'],
    regulations: ['pci_dss', 'lfpdppp', 'cnbv', 'ley_fintech'],
    environments: ['public_cloud', 'saas', 'public_web_apps', 'mobile_apps'],
  },
  footprint: {
    domains: ['acme.example', 'pagos.acme.example'],
    brands: ['ACME Pay'],
    technologies: ['AWS', 'Microsoft 365', 'Salesforce'],
    third_parties: ['Proveedor de nómina externo'],
  },
  risk: {
    appetite: 'minimal',
    concerns: ['ransomware', 'fraud', 'business_email_compromise', 'data_theft'],
    past_incidents: 'Campaña de phishing contra el equipo de finanzas en marzo de 2025.',
    constraints: 'Sin cambios en producción los últimos tres días de cada mes (cierre contable).',
    notes: 'El Buen Fin y diciembre triplican las transacciones.',
  },
}
