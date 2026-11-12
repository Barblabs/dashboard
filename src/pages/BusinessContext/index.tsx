import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorCode } from '../../api/client'
import {
  useBusinessContextQuery,
  useSaveBusinessContextMutation,
  type BusinessContext,
} from '../../api/businessContext'
import { useCurrentUser } from '../../auth/store'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Button } from '../../components/ui/Button'
import { requestErrorText } from '../../i18n/errors'
import { BusinessContextForm } from './Form'

const KEYS = {
  loading: 'businessContext.loading',
  failed: 'businessContext.loadFailed',
  network: 'businessContext.networkError',
  retry: 'businessContext.retry',
} as const

export function BusinessContextPage() {
  const { t } = useTranslation()
  const query = useBusinessContextQuery()
  const readOnly = useCurrentUser()?.role !== 'customer_admin'
  const [startedEditing, setStartedEditing] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // A saved context has been started by definition; an empty one waits for an import or a manual start.
  const started = (query.data?.version ?? 0) > 0 || startedEditing

  return (
    <Page
      title={t('businessContext.header.title')}
      subtitle={t('businessContext.header.subtitle')}
      actions={
        !readOnly &&
        started && (
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            {t('businessContext.import.button')}
          </Button>
        )
      }
    >
      <QueryBoundary query={query} keys={KEYS}>
        {(stored) => (
          <SavedForm
            stored={stored}
            reload={() => void query.refetch()}
            readOnly={readOnly}
            started={started}
            onStart={() => setStartedEditing(true)}
            importOpen={importOpen}
            onImportOpenChange={setImportOpen}
          />
        )}
      </QueryBoundary>
    </Page>
  )
}

interface SavedFormProps {
  stored: BusinessContext
  reload: () => void
  readOnly: boolean
  started: boolean
  onStart: () => void
  importOpen: boolean
  onImportOpenChange: (open: boolean) => void
}

// Ties the form to the save request and reports how the latest save went.
function SavedForm({ stored, reload, ...formProps }: SavedFormProps) {
  const { t } = useTranslation()
  const save = useSaveBusinessContextMutation()

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
            reload()
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
    // A new version is a fresh form: what was typed is either saved or deliberately reloaded.
    <BusinessContextForm
      key={stored.version}
      stored={stored}
      saving={save.isPending}
      saveStatus={saveStatus}
      onSave={(context) => save.mutate({ version: stored.version, context })}
      {...formProps}
    />
  )
}
