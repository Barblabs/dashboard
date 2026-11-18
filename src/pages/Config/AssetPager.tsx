import { useTranslation } from 'react-i18next'
import type { Pager } from '../../api/inventory'
import { Button } from '../../components/ui/Button'

export function AssetPager({ pager }: { pager: Pager }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('config.inventory.pagination.label')} className="flex items-center gap-3">
      <span className="font-body text-[0.8125rem] text-gray">
        {t('config.inventory.pagination.page', { page: pager.page })}
      </span>
      <Button variant="secondary" size="sm" disabled={!pager.previous} onClick={pager.previous ?? undefined}>
        {t('config.inventory.pagination.previous')}
      </Button>
      <Button variant="secondary" size="sm" disabled={!pager.next} onClick={pager.next ?? undefined}>
        {t('config.inventory.pagination.next')}
      </Button>
    </nav>
  )
}
