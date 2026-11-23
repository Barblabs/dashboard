import { useTranslation } from 'react-i18next'
import { errorCode } from '../../api/client'
import { useBusinessContextQuery } from '../../api/businessContext'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import type { SaveState } from './saveState'

/** How the latest save went, shown beside the save button. */
export function SaveStatus({ state, onReload }: { state: SaveState; onReload: () => void }) {
  const { t } = useTranslation()
  const { refetch } = useBusinessContextQuery()

  switch (state.status) {
    case 'failed':
      return (
        <div role="alert" className="flex flex-wrap items-center gap-3 font-body text-[0.8125rem] text-critical">
          {requestErrorText(state.error, t, { fallback: 'businessContext.save.failed' })}
          {errorCode(state.error) === 'business_context_stale' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onReload()
                void refetch()
              }}
            >
              {t('businessContext.save.reload')}
            </Button>
          )}
        </div>
      )
    case 'saved':
      return (
        <p role="status" className="font-body text-[0.8125rem] text-gray">
          ✓ {t('businessContext.save.saved')}
        </p>
      )
    default:
      return null
  }
}
