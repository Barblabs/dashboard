import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { CELL, HEADER_CELL, HEADER_ROW } from '../../components/ui/table'
import { ScoreBandBadge } from '../Findings/ScoreBandBadge'
import { MONO } from '../Findings/styles'
import { SAMPLE_FINDINGS } from './samples'

const ROW_DELAYS = ['motion-safe:[animation-delay:370ms]', 'motion-safe:[animation-delay:460ms]', 'motion-safe:[animation-delay:550ms]', 'motion-safe:[animation-delay:640ms]', 'motion-safe:[animation-delay:730ms]']

export function FindingsPreview() {
  const { t } = useTranslation()

  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border border-white/15 bg-white text-left">
      <div className="flex items-center gap-2.5 border-b border-border-panel bg-panel px-5 py-3">
        <span className="font-title text-[1rem] text-navy">{t('sidebar.nav.findings')}</span>
        <span className="font-body text-[0.75rem] text-gray">{t('findings.group.size', { count: SAMPLE_FINDINGS.length })}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-2">
        <Badge variant="solid">{t('findings.group.position', { position: 1 })}</Badge>
        <span className="font-title text-[1rem] leading-tight text-navy">{t('landing.hero.group')}</span>
      </div>
      <table className="w-full table-fixed border-collapse text-[0.8125rem]">
        <thead>
          <tr className={HEADER_ROW}>
            <th className={`${HEADER_CELL} w-[55%] pl-5 sm:w-[28%] lg:w-[42%] xl:w-[28%]`}>{t('findings.columns.cve')}</th>
            <th className={`${HEADER_CELL} hidden sm:table-cell lg:hidden xl:table-cell`}>{t('findings.columns.component')}</th>
            <th className={`${HEADER_CELL} w-[22%] max-sm:hidden`}>{t('findings.columns.asset')}</th>
            <th className={`${HEADER_CELL} pr-5 sm:w-[24%]`}>{t('findings.columns.score')}</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_FINDINGS.map((finding, index) => (
            <tr key={finding.cve} className={`motion-safe:animate-rise-in motion-reduce:animate-fade-in ${ROW_DELAYS[index]}`}>
              <td className={`${CELL} ${MONO} truncate pl-5 font-semibold`}>{finding.cve}</td>
              <td className={`${CELL} ${MONO} hidden truncate sm:table-cell lg:hidden xl:table-cell`}>{finding.component}</td>
              <td className={`${CELL} truncate max-sm:hidden`}>{finding.asset}</td>
              <td className={`${CELL} ${MONO} pr-5 whitespace-nowrap`}>
                {finding.score}
                <ScoreBandBadge band={finding.band} className="ml-2" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
