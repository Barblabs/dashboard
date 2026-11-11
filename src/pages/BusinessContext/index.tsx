import { useTranslation } from 'react-i18next'
import { errorCode } from '../../api/client'
import { useBusinessContextQuery, useSaveBusinessContextMutation } from '../../api/businessContext'
import { useCurrentUser } from '../../auth/store'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import { BusinessContextForm } from './Form'

const PAGE = 'flex flex-1 flex-col gap-6 overflow-y-auto px-10 py-8'

export function BusinessContextPage() {
  const { t } = useTranslation()
  const query = useBusinessContextQuery()
  const save = useSaveBusinessContextMutation()
  const readOnly = useCurrentUser()?.role !== 'customer_admin'

  if (query.isPending) {
    return (
      <main className={PAGE}>
        <p className="py-12 text-center font-body text-[0.875rem] text-gray">{t('businessContext.loading')}</p>
      </main>
    )
  }
  if (query.isError) {
    return (
      <main className={PAGE}>
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="font-body text-[0.875rem] text-critical">{t('businessContext.loadFailed')}</p>
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            {t('businessContext.retry')}
          </Button>
        </div>
      </main>
    )
  }

  const stored = query.data
  const stale = errorCode(save.error) === 'business_context_stale'
  const saveStatus = save.isError ? (
    <div role="alert" className="flex flex-wrap items-center gap-3 font-body text-[0.8125rem] text-critical">
      {requestErrorText(save.error, t, { fallback: 'businessContext.save.failed' })}
      {stale && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            save.reset()
            void query.refetch()
          }}
        >
          {t('businessContext.save.reload')}
        </Button>
      )}
    </div>
  ) : save.isSuccess && save.data.version === stored.version ? (
    <p role="status" className="font-body text-[0.8125rem] text-gray">
      ✓ {t('businessContext.save.saved')}
    </p>
  ) : null

  return (
    <main className={PAGE}>
      {/* A new version is a fresh form: what was typed is either saved or deliberately reloaded. */}
      <BusinessContextForm
        key={stored.version}
        stored={stored}
        readOnly={readOnly}
        saving={save.isPending}
        saveStatus={saveStatus}
        onSave={(context) => save.mutate({ version: stored.version, context })}
      />
    </main>
  )
}
