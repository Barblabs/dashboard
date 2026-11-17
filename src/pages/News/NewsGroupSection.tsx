import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { NewsGroup, Relevance } from '../../api/newsDigests'
import { NewsItemView } from './NewsItemView'

/*
 * The closer a Relevance, the more the group stands out: a stronger border for the news that
 * names the Customer, the plainest frame for attacks on Peers, which are only context.
 */
const FRAME: Record<Relevance, string> = {
  named: 'border-2 border-navy bg-white',
  finding: 'border border-border-panel bg-white',
  footprint: 'border border-border-panel bg-white',
  peer: 'border border-dashed border-muted-bg',
}

export function NewsGroupSection({ group }: { group: NewsGroup }) {
  const { t } = useTranslation()
  const headingId = useId()
  const { relevance, items } = group

  return (
    <section aria-labelledby={headingId} className={`flex flex-col gap-5 rounded-xl p-6 ${FRAME[relevance]}`}>
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id={headingId}
            className={`font-title text-[1.25rem] leading-[1.2] ${relevance === 'peer' ? 'text-gray' : 'text-navy'}`}
          >
            {t(`news.relevance.${relevance}.title`)}
          </h2>
          <span className="font-body text-[0.8125rem] text-gray">{t('news.group.size', { count: items.length })}</span>
        </div>
        <p className="font-body text-[0.875rem] leading-[1.4] text-gray">{t(`news.relevance.${relevance}.description`)}</p>
        {relevance === 'peer' && (
          <p className="font-body text-[0.875rem] leading-[1.4] font-semibold text-gray">
            {t('news.relevance.peer.context')}
          </p>
        )}
      </header>

      <ol className="flex flex-col divide-y divide-border-row">
        {items.map((item) => (
          <li key={item.news_item_id} className="py-5 first:pt-0 last:pb-0">
            <NewsItemView item={item} />
          </li>
        ))}
      </ol>
    </section>
  )
}
