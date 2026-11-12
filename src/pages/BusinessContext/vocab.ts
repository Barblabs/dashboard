import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  CONCERNS,
  COUNTRIES,
  DATA_CATEGORIES,
  DOWNTIMES,
  EMPLOYEE_RANGES,
  ENVIRONMENTS,
  IMPACTS,
  ORGANIZATION_TYPES,
  REGULATIONS,
  REVENUE_RANGES,
  RISK_APPETITES,
  SECTORS,
  type Concern,
  type CountryCode,
  type DataCategory,
  type Downtime,
  type EmployeeRange,
  type Environment,
  type Impact,
  type OrganizationType,
  type Regulation,
  type RevenueRange,
  type RiskAppetite,
  type Sector,
} from '../../api/businessContext'
import { useLocale } from '../../i18n/format'
import { countryNamer } from './model'

/** The codes of each vocabulary a field picks from. */
export interface Codes {
  sectors: Sector
  organizationTypes: Exclude<OrganizationType, ''>
  employees: Exclude<EmployeeRange, ''>
  revenue: Exclude<RevenueRange, ''>
  dataCategories: DataCategory
  regulations: Regulation
  environments: Environment
  concerns: Concern
  appetite: Exclude<RiskAppetite, ''>
  impact: Exclude<Impact, ''>
  downtime: Exclude<Downtime, ''>
  countries: CountryCode
}

export type Vocab = keyof Codes

interface Vocabulary<T extends string> {
  codes: readonly T[]
  namer: (t: TFunction<'translation'>, language: string) => (code: T) => string
  /** Listed alphabetically in the UI's language rather than in the backend's order. */
  byName?: boolean
}

// A mapped type, so indexing it with a generic `Vocab` keeps the codes and the namer paired.
const VOCABS: { [V in Vocab]: Vocabulary<Codes[V]> } = {
  sectors: { codes: SECTORS, namer: (t) => (c) => t(`businessContext.vocab.sectors.${c}`) },
  organizationTypes: { codes: ORGANIZATION_TYPES, namer: (t) => (c) => t(`businessContext.vocab.organizationTypes.${c}`) },
  employees: { codes: EMPLOYEE_RANGES, namer: (t) => (c) => t(`businessContext.vocab.employees.${c}`) },
  revenue: { codes: REVENUE_RANGES, namer: (t) => (c) => t(`businessContext.vocab.revenue.${c}`) },
  dataCategories: { codes: DATA_CATEGORIES, namer: (t) => (c) => t(`businessContext.vocab.dataCategories.${c}`) },
  regulations: { codes: REGULATIONS, namer: (t) => (c) => t(`businessContext.vocab.regulations.${c}`) },
  environments: { codes: ENVIRONMENTS, namer: (t) => (c) => t(`businessContext.vocab.environments.${c}`) },
  concerns: { codes: CONCERNS, namer: (t) => (c) => t(`businessContext.vocab.concerns.${c}`) },
  appetite: { codes: RISK_APPETITES, namer: (t) => (c) => t(`businessContext.vocab.appetite.${c}`) },
  impact: { codes: IMPACTS, namer: (t) => (c) => t(`businessContext.vocab.impact.${c}`) },
  downtime: { codes: DOWNTIMES, namer: (t) => (c) => t(`businessContext.vocab.downtime.${c}`) },
  countries: { codes: COUNTRIES, namer: (_, language) => countryNamer(language), byName: true },
}

/** A vocabulary's codes in the order the UI lists them, and the name of each in the UI's language. */
export function useVocab<V extends Vocab>(vocab: V): { codes: readonly Codes[V][]; labelOf: (code: Codes[V]) => string } {
  const { t } = useTranslation()
  const language = useLocale()
  return useMemo(() => {
    const { codes, namer, byName }: Vocabulary<Codes[V]> = VOCABS[vocab]
    const labelOf = namer(t, language)
    const ordered = byName ? codes.toSorted((a, b) => labelOf(a).localeCompare(labelOf(b), language)) : codes
    return { codes: ordered, labelOf }
  }, [vocab, t, language])
}
