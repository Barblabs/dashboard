import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { MONO } from './styles'

/*
 * The JSON pointers the Prioritizer cites most, by what a person calls them. A Map, so a path
 * like "/constructor" cannot hit the prototype. Any other pointer shows as written.
 */
const PATH_LABELS = new Map<string, ParseKeys>([
  ['/kev/date_added', 'findings.detail.evidence.kevDateAdded'],
  ['/kev/known_ransomware_campaign_use', 'findings.detail.evidence.kevRansomware'],
  ['/epss/probability', 'findings.detail.vulnerability.epss'],
  ['/asset/name', 'findings.columns.asset'],
  ['/asset/criticality', 'findings.detail.asset.criticality'],
  ['/asset/exposure', 'findings.detail.asset.exposure'],
  ['/asset/lifecycle_stage', 'findings.detail.asset.lifecycleStage'],
  ['/asset/information_classification', 'findings.detail.asset.informationClassification'],
  ['/risk/appetite', 'businessContext.fields.appetite'],
])

const CRITICAL_SERVICE = /^\/(asset|operations)\/critical_services\/\d+\/[a-z_]+$/

/*
 * The Business Context's lists, which the Editor cites one entry at a time, such as
 * /operations/data_categories/0: each is named by its field, whatever the entry.
 */
const CONTEXT_LISTS = new Map<string, ParseKeys>([
  ['/profile/sectors', 'businessContext.fields.sectors'],
  ['/geography/countries', 'businessContext.fields.countries.label'],
  ['/operations/data_categories', 'businessContext.fields.dataCategories'],
  ['/operations/regulations', 'businessContext.fields.regulations'],
  ['/operations/environments', 'businessContext.fields.environments'],
  ['/footprint/domains', 'businessContext.fields.domains.label'],
  ['/footprint/brands', 'businessContext.fields.brands'],
  ['/footprint/technologies', 'businessContext.fields.technologies.label'],
  ['/footprint/third_parties', 'businessContext.fields.thirdParties'],
  ['/risk/concerns', 'businessContext.fields.concerns'],
])

const LIST_ENTRY = /^(.+)\/\d+$/

function labelKey(path: string): ParseKeys | null {
  if (CRITICAL_SERVICE.test(path)) return 'findings.detail.evidence.criticalService'
  const list = LIST_ENTRY.exec(path)?.[1]
  return PATH_LABELS.get(path) ?? (list === undefined ? null : (CONTEXT_LISTS.get(list) ?? null))
}

interface Props {
  /** Names the list for assistive tech: the Finding's evidence or the Business Context's. */
  label: string
  items: { path: string; value: string }[]
  /** Business Context evidence has a dashed border: it is what the Customer stated, not data. */
  fromContext?: boolean
}

/** Evidence a Priority Group cites, as label and value; the pointer itself is its tooltip. */
export function Evidence({ label, items, fromContext = false }: Props) {
  const { t } = useTranslation()
  if (items.length === 0) return null

  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((e, i) => {
        const key = labelKey(e.path)
        return (
          <li
            key={i}
            title={e.path}
            className={`inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1 font-body text-[0.75rem] text-gray ${
              fromContext ? 'border-dashed border-muted-bg' : 'border-border-panel bg-panel'
            }`}
          >
            <span className={key ? '' : `${MONO} text-[0.75rem]`}>{key ? t(key) : e.path}</span>
            <span className={`${MONO} text-[0.75rem] font-medium text-navy`}>{e.value}</span>
          </li>
        )
      })}
    </ul>
  )
}
