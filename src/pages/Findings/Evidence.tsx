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

function labelKey(path: string): ParseKeys | null {
  if (CRITICAL_SERVICE.test(path)) return 'findings.detail.evidence.criticalService'
  return PATH_LABELS.get(path) ?? null
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
