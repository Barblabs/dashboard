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
  /** In the order the UI lists them. */
  codes: readonly T[]
  labelOf: (code: T) => string
}

// A mapped type, so indexing it with a generic `Vocab` keeps the codes and the names paired.
const VOCABS: { [V in Vocab]: (t: TFunction<'translation'>, language: string) => Vocabulary<Codes[V]> } = {
  sectors: (t) => ({ codes: SECTORS, labelOf: (c) => t(`businessContext.vocab.sectors.${c}`) }),
  organizationTypes: (t) => ({ codes: ORGANIZATION_TYPES, labelOf: (c) => t(`businessContext.vocab.organizationTypes.${c}`) }),
  employees: (t) => ({ codes: EMPLOYEE_RANGES, labelOf: (c) => t(`businessContext.vocab.employees.${c}`) }),
  revenue: (t) => ({ codes: REVENUE_RANGES, labelOf: (c) => t(`businessContext.vocab.revenue.${c}`) }),
  dataCategories: (t) => ({ codes: DATA_CATEGORIES, labelOf: (c) => t(`businessContext.vocab.dataCategories.${c}`) }),
  regulations: (t) => ({ codes: REGULATIONS, labelOf: (c) => t(`businessContext.vocab.regulations.${c}`) }),
  environments: (t) => ({ codes: ENVIRONMENTS, labelOf: (c) => t(`businessContext.vocab.environments.${c}`) }),
  concerns: (t) => ({ codes: CONCERNS, labelOf: (c) => t(`businessContext.vocab.concerns.${c}`) }),
  appetite: (t) => ({ codes: RISK_APPETITES, labelOf: (c) => t(`businessContext.vocab.appetite.${c}`) }),
  impact: (t) => ({ codes: IMPACTS, labelOf: (c) => t(`businessContext.vocab.impact.${c}`) }),
  downtime: (t) => ({ codes: DOWNTIMES, labelOf: (c) => t(`businessContext.vocab.downtime.${c}`) }),
  // Alphabetical in the UI's language: nobody looks for a country in code order.
  countries: (_, language) => {
    const labelOf = countryNamer(language)
    return { codes: COUNTRIES.toSorted((a, b) => labelOf(a).localeCompare(labelOf(b), language)), labelOf }
  },
}

/** A vocabulary's codes as the UI lists them, and the name of each in the UI's language. */
export function useVocab<V extends Vocab>(vocab: V): Vocabulary<Codes[V]> {
  const { t } = useTranslation()
  const language = useLocale()
  return useMemo(() => VOCABS[vocab](t, language), [vocab, t, language])
}
