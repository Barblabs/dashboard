import { useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, type FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type {
  BusinessContext,
  BusinessContextFields,
  Draft,
  FieldPath,
  SaveBusinessContext,
  Section,
} from '../../api/businessContext'
import { Button } from '../../components/ui/Button'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import { ImportDialog } from './ImportDialog'
import { FormMetaContext, type FormMeta } from './meta'
import { mergeDraft } from './model'
import { SaveStatus } from './SaveStatus'
import { businessContextSchema } from './schema'
import { Footprint } from './sections/Footprint'
import { Geography } from './sections/Geography'
import { Operations } from './sections/Operations'
import { Profile } from './sections/Profile'
import { Risk } from './sections/Risk'
import { StartScreen } from './StartScreen'

const SECTIONS: Section[] = ['profile', 'geography', 'operations', 'footprint', 'risk']

const CONTENT: Record<Section, () => ReactNode> = {
  profile: Profile,
  geography: Geography,
  operations: Operations,
  footprint: Footprint,
  risk: Risk,
}

interface FormProps {
  stored: BusinessContext
  readOnly: boolean
  /** Owned by the page: it outlives this form, which remounts on every new version. */
  save: SaveBusinessContext
  /** Until something is saved, importing documents is the way in; filling by hand is the alternative. */
  started: boolean
  onStart: () => void
  /** The page header opens the import dialog too, so its state lives with the page. */
  importOpen: boolean
  onImportOpenChange: (open: boolean) => void
}

export function BusinessContextForm({
  stored,
  readOnly,
  save,
  started,
  onStart,
  importOpen,
  onImportOpenChange,
}: FormProps) {
  const { t } = useTranslation()
  const form = useForm<BusinessContextFields>({ defaultValues: stored.context, resolver: zodResolver(businessContextSchema) })
  const [section, setSection] = useState<Section>('profile')
  const [filled, setFilled] = useState<Set<FieldPath>>(new Set())
  const [applied, setApplied] = useState<number | null>(null)
  const meta = useMemo<FormMeta>(() => ({ filled, readOnly }), [filled, readOnly])
  const dirty = form.formState.isDirty
  const saving = save.isPending
  const position = SECTIONS.indexOf(section)
  const previous = SECTIONS[position - 1]
  const next = SECTIONS[position + 1]

  function applyDraft(draft: Draft) {
    const merge = mergeDraft(form.getValues(), draft.context)
    /*
     * Keeping the defaults leaves them at the stored version, so the form reads dirty and Discard
     * goes back to it. A draft only fills empty fields, so what stopped a save still stands.
     */
    form.reset(merge.fields, {
      keepDefaultValues: true,
      keepErrors: true,
      keepIsSubmitted: true,
      keepSubmitCount: true,
      keepTouched: true,
    })
    setFilled((prev) => new Set([...prev, ...merge.filled]))
    setApplied(merge.filled.length)
    onStart()
  }

  function discard() {
    form.reset(stored.context)
    setFilled(new Set())
    setApplied(null)
  }

  // Only the open section is on screen, so a save it cannot make shows the section that stops it.
  function showFirstError(errors: FieldErrors<BusinessContextFields>) {
    const failing = SECTIONS.find((s) => errors[s])
    if (failing) setSection(failing)
  }

  return (
    <FormProvider {...form}>
      <FormMetaContext.Provider value={meta}>
        {!started && <StartScreen readOnly={readOnly} onImport={() => onImportOpenChange(true)} onStart={onStart} />}

        {applied !== null && (
          <div role="status" className="flex items-center justify-between gap-4 rounded-lg bg-cyan/10 px-4 py-2.5">
            <p className="font-body text-[0.875rem] text-navy">
              {applied > 0 ? t('businessContext.import.applied', { count: applied }) : t('businessContext.import.nothingNew')}
            </p>
            <button
              type="button"
              aria-label={t('businessContext.import.dismiss')}
              onClick={() => setApplied(null)}
              className="cursor-pointer rounded-md px-2 font-body text-[1.125rem] leading-none text-gray hover:text-navy focus-ring"
            >
              ×
            </button>
          </div>
        )}

        {started && (
          <form
            noValidate
            onSubmit={(e) => void form.handleSubmit((context) => save.mutate({ version: stored.version, context }), showFirstError)(e)}
            className="flex flex-col rounded-xl border border-border-panel bg-white"
          >
            <Tabs value={section} onValueChange={(value) => setSection(value as Section)}>
              <TabList>
                {SECTIONS.map((s, i) => (
                  <Tab key={s} value={s}>
                    <span className="flex size-6 items-center justify-center rounded-full border border-muted-bg font-mono text-[0.75rem] group-data-active:border-navy group-data-active:bg-navy group-data-active:text-white">
                      {i + 1}
                    </span>
                    {t(`businessContext.sections.${s}.title`)}
                  </Tab>
                ))}
              </TabList>
              {SECTIONS.map((s) => {
                const Content = CONTENT[s]
                return (
                  <TabPanel key={s} value={s} className="flex flex-col gap-6 p-6 md:p-8">
                    <p className="font-body text-[0.9375rem] text-gray">{t(`businessContext.sections.${s}.description`)}</p>
                    <Content />
                  </TabPanel>
                )
              })}
            </Tabs>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border-panel px-6 py-4">
              <div>
                {previous && (
                  <button
                    type="button"
                    onClick={() => setSection(previous)}
                    className="cursor-pointer rounded-md px-2 py-1 font-body text-[0.875rem] font-semibold text-gray hover:text-navy focus-ring"
                  >
                    ← {t('businessContext.previous')}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <SaveStatus save={save} version={stored.version} />
                {!readOnly && dirty && !saving && (
                  <button
                    type="button"
                    onClick={discard}
                    className="cursor-pointer rounded-md px-2 py-1 font-body text-[0.8125rem] text-gray hover:text-navy focus-ring"
                  >
                    {t('businessContext.save.discard')}
                  </button>
                )}
                {next && (
                  <Button variant="secondary" size="sm" onClick={() => setSection(next)}>
                    {t('businessContext.next')} →
                  </Button>
                )}
                {!readOnly && (
                  <Button type="submit" size="sm" loading={saving} disabled={!dirty}>
                    {saving ? t('businessContext.save.submitting') : t('businessContext.save.submit')}
                  </Button>
                )}
              </div>
            </footer>
          </form>
        )}

        {!readOnly && <ImportDialog open={importOpen} onClose={() => onImportOpenChange(false)} onDraft={applyDraft} />}
      </FormMetaContext.Provider>
    </FormProvider>
  )
}
