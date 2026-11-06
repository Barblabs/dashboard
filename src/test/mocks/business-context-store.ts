import type { BusinessContext, BusinessContextFields } from '../../api/businessContext'
import { emptyFields } from '../../pages/BusinessContext/model'

const STORAGE_KEY = 'barbattack_mock_business_context'

export const KEY_FIELDS = [
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

export function loadBusinessContext(): BusinessContext {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as BusinessContext) : unsaved()
}

export function saveBusinessContext(context: BusinessContext) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context))
}

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
        name: 'Nómina',
        description: 'Paga a los empleados cada quincena.',
        impact: 'high',
        max_downtime: '1d_3d',
        assets: [],
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
