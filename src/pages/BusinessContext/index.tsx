import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBusinessContextQuery, useSaveBusinessContextMutation } from '../../api/businessContext'
import { useCanEdit } from '../../auth/permissions'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Button } from '../../components/ui/Button'
import { BusinessContextForm } from './Form'

const KEYS = {
  loading: 'businessContext.loading',
  failed: 'businessContext.loadFailed',
  network: 'businessContext.networkError',
} as const

export function BusinessContextPage() {
  const { t } = useTranslation()
  const query = useBusinessContextQuery()
  const save = useSaveBusinessContextMutation()
  const readOnly = !useCanEdit()
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
          // A new version is a fresh form: what was typed is either saved or deliberately reloaded.
          <BusinessContextForm
            key={stored.version}
            stored={stored}
            save={save}
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
