import { useTranslation } from 'react-i18next'
import { errorCode } from '../../api/client'
import { useBusinessContextQuery, type SaveBusinessContext } from '../../api/businessContext'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'

interface Props {
  save: SaveBusinessContext
  /** The version on screen; a success only counts while it is still the one shown. */
  version: number
}

/** How the latest save went, shown beside the save button. */
export function SaveStatus({ save, version }: Props) {
  const { t } = useTranslation()
  const { refetch } = useBusinessContextQuery()

  if (save.isError) {
    const stale = errorCode(save.error) === 'business_context_stale'
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 font-body text-[0.8125rem] text-critical">
        {requestErrorText(save.error, t, { fallback: 'businessContext.save.failed' })}
        {stale && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              save.reset()
              void refetch()
            }}
          >
            {t('businessContext.save.reload')}
          </Button>
        )}
      </div>
    )
  }

  if (save.isSuccess && save.data.version === version) {
    return (
      <p role="status" className="font-body text-[0.8125rem] text-gray">
        ✓ {t('businessContext.save.saved')}
      </p>
    )
  }

  return null
}
