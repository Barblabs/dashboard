import { useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch, type FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  LIMITS,
  useAssetNamesQuery,
  type BusinessContext,
  type Draft,
  type Section,
  type SaveBusinessContext,
} from '../../api/businessContext'
import { Button } from '../../components/ui/Button'
import { CloseIcon, UploadFileIcon } from '../../components/ui/icons'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import { EMPTY } from '../../i18n/format'
import { MultiSelectField, SelectField, TextAreaField, TextField } from './fields'
import { ImportDialog } from './ImportDialog'
import { FormMetaContext, useMeta, type Fields, type FormMeta } from './meta'
import { SaveStatus } from './SaveStatus'
import { TagField } from './TagField'
import { canonicalDomain, mergeDraft } from './model'
import { businessContextSchema } from './schema'
import { useVocab } from './vocab'

const SECTIONS: Section[] = ['profile', 'geography', 'operations', 'footprint', 'risk']

const ROW = 'grid gap-5 md:grid-cols-2'

function Profile() {
  const { t } = useTranslation()
  return (
    <>
      <TextAreaField
        name="profile.summary"
        label={t('businessContext.fields.summary.label')}
        placeholder={t('businessContext.fields.summary.placeholder')}
        max={LIMITS.summary}
        rows={4}
      />
      <MultiSelectField name="profile.sectors" vocab="sectors" label={t('businessContext.fields.sectors')} />
      <div className="grid gap-5 md:grid-cols-3">
        <SelectField
          name="profile.organization_type"
          vocab="organizationTypes"
          label={t('businessContext.fields.organizationType')}
        />
        <SelectField name="profile.employees" vocab="employees" label={t('businessContext.fields.employees')} />
        <SelectField name="profile.annual_revenue" vocab="revenue" label={t('businessContext.fields.annualRevenue')} />
      </div>
      <div className={ROW}>
        <TextAreaField name="profile.mission" label={t('businessContext.fields.mission')} max={LIMITS.statement} />
        <TextAreaField name="profile.vision" label={t('businessContext.fields.vision')} max={LIMITS.statement} />
      </div>
    </>
  )
}

function Geography() {
  const { t } = useTranslation()
  return (
    <div className={ROW}>
      <SelectField name="geography.headquarters" vocab="countries" label={t('businessContext.fields.headquarters')} />
      <MultiSelectField
        name="geography.countries"
        vocab="countries"
        label={t('businessContext.fields.countries.label')}
        placeholder={t('businessContext.fields.countries.placeholder')}
      />
    </div>
  )
}

function CriticalServices() {
  const { t } = useTranslation()
  const { suggested, readOnly } = useMeta('operations.critical_services')
  const { control } = useFormContext<Fields>()
  const { fields, append, remove } = useFieldArray({ control, name: 'operations.critical_services' })
  const assetNames = useAssetNamesQuery()

  return (
    <div className={`flex flex-col gap-2 ${suggested ? '-ml-3 border-l-2 border-cyan pl-[10px]' : ''}`}>
      <span className={`font-body font-semibold ${readOnly ? 'text-[0.8125rem] text-gray' : 'text-[0.875rem] text-navy'}`}>
        {t('businessContext.fields.criticalServices.label')}
      </span>
      {readOnly && fields.length === 0 && <p className="font-body text-[0.9375rem] text-muted-bg">{EMPTY}</p>}
      {fields.map((item, index) =>
        readOnly ? (
          <ShownService key={item.id} index={index} />
        ) : (
          <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border-panel p-3">
            <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-4">
              <div className="md:col-span-2">
                <TextField
                  name={`operations.critical_services.${index}.name`}
                  label={t('businessContext.fields.criticalServices.name')}
                  placeholder={t('businessContext.fields.criticalServices.namePlaceholder')}
                  max={LIMITS.entry}
                  hideLabel
                  className="font-semibold"
                />
              </div>
              <div className="md:col-span-2">
                <TagField
                  name={`operations.critical_services.${index}.assets`}
                  label={t('businessContext.fields.criticalServices.assets')}
                  placeholder={t('businessContext.fields.criticalServices.assetsPlaceholder')}
                  suggestions={assetNames.data}
                  hideLabel
                />
              </div>
              <div className="md:col-span-2">
                <TextField
                  name={`operations.critical_services.${index}.description`}
                  label={t('businessContext.fields.criticalServices.description')}
                  placeholder={t('businessContext.fields.criticalServices.descriptionPlaceholder')}
                  max={LIMITS.statement}
                  hideLabel
                />
              </div>
              <SelectField
                name={`operations.critical_services.${index}.impact`}
                vocab="impact"
                label={t('businessContext.fields.criticalServices.impact')}
                emptyLabel={t('businessContext.fields.criticalServices.impactPlaceholder')}
                hideLabel
              />
              <SelectField
                name={`operations.critical_services.${index}.max_downtime`}
                vocab="downtime"
                label={t('businessContext.fields.criticalServices.maxDowntime')}
                emptyLabel={t('businessContext.fields.criticalServices.maxDowntimePlaceholder')}
                hideLabel
              />
            </div>
            <button
              type="button"
              aria-label={t('businessContext.fields.criticalServices.remove')}
              onClick={() => remove(index)}
              className="mt-2.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray hover:bg-panel hover:text-critical focus-ring"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        ),
      )}
      {!readOnly && fields.length < LIMITS.services && (
        <button
          type="button"
          onClick={() => append({ name: '', description: '', impact: '', max_downtime: '', assets: [] })}
          className="cursor-pointer rounded-lg border border-dashed border-muted-bg py-3 font-body text-[0.875rem] font-semibold text-gray transition-colors hover:border-navy hover:text-navy focus-ring"
        >
          + {t('businessContext.fields.criticalServices.add')}
        </button>
      )}
    </div>
  )
}

function ShownService({ index }: { index: number }) {
  const { control } = useFormContext<Fields>()
  const service = useWatch({ control, name: `operations.critical_services.${index}` })
  const impact = useVocab('impact').labelOf
  const downtime = useVocab('downtime').labelOf
  const tolerance = [
    service.impact && impact(service.impact),
    service.max_downtime && downtime(service.max_downtime),
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-body text-[0.9375rem] font-semibold text-navy">{service.name}</p>
      {service.description && <p className="font-body text-[0.875rem] text-navy">{service.description}</p>}
      {tolerance.length > 0 && <p className="font-body text-[0.8125rem] text-gray">{tolerance.join(' · ')}</p>}
      {service.assets.length > 0 && <p className="font-mono text-[0.75rem] text-gray">{service.assets.join(' · ')}</p>}
    </div>
  )
}

function Operations() {
  const { t } = useTranslation()
  return (
    <>
      <CriticalServices />
      <MultiSelectField name="operations.data_categories" vocab="dataCategories" label={t('businessContext.fields.dataCategories')} />
      <MultiSelectField name="operations.regulations" vocab="regulations" label={t('businessContext.fields.regulations')} />
      <MultiSelectField name="operations.environments" vocab="environments" label={t('businessContext.fields.environments')} />
    </>
  )
}

function Footprint() {
  const { t } = useTranslation()
  const domain = (entry: string) => {
    const value = canonicalDomain(entry)
    return value ? { value } : { error: t('businessContext.validation.domain', { value: entry }) }
  }
  return (
    <>
      <div className={ROW}>
        <TagField
          name="footprint.domains"
          label={t('businessContext.fields.domains.label')}
          placeholder={t('businessContext.fields.domains.placeholder')}
          canonical={domain}
        />
        <TagField
          name="footprint.brands"
          label={t('businessContext.fields.brands.label')}
          placeholder={t('businessContext.fields.brands.placeholder')}
        />
      </div>
      <div className={ROW}>
        <TagField
          name="footprint.technologies"
          label={t('businessContext.fields.technologies.label')}
          placeholder={t('businessContext.fields.technologies.placeholder')}
        />
        <TagField
          name="footprint.third_parties"
          label={t('businessContext.fields.thirdParties.label')}
          placeholder={t('businessContext.fields.thirdParties.placeholder')}
        />
      </div>
    </>
  )
}

function Risk() {
  const { t } = useTranslation()
  return (
    <>
      <div className={ROW}>
        <SelectField
          name="risk.appetite"
          vocab="appetite"
          label={t('businessContext.fields.appetite')}
          hint={t('businessContext.fields.appetiteHint')}
        />
        <MultiSelectField name="risk.concerns" vocab="concerns" label={t('businessContext.fields.concerns')} />
      </div>
      <TextAreaField
        name="risk.past_incidents"
        label={t('businessContext.fields.pastIncidents.label')}
        placeholder={t('businessContext.fields.pastIncidents.placeholder')}
        max={LIMITS.narrative}
      />
      <div className={ROW}>
        <TextAreaField
          name="risk.constraints"
          label={t('businessContext.fields.constraints.label')}
          placeholder={t('businessContext.fields.constraints.placeholder')}
          max={LIMITS.narrative}
        />
        <TextAreaField
          name="risk.notes"
          label={t('businessContext.fields.notes.label')}
          placeholder={t('businessContext.fields.notes.placeholder')}
          max={LIMITS.narrative}
        />
      </div>
    </>
  )
}

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
  const form = useForm<Fields>({ defaultValues: stored.context, resolver: zodResolver(businessContextSchema) })
  const [section, setSection] = useState<Section>('profile')
  const [filled, setFilled] = useState<Set<string>>(new Set())
  const [applied, setApplied] = useState<number | null>(null)
  const meta = useMemo<FormMeta>(() => ({ filled, readOnly }), [filled, readOnly])
  const dirty = form.formState.isDirty
  const saving = save.isPending
  const position = SECTIONS.indexOf(section)
  const previous = SECTIONS[position - 1]
  const next = SECTIONS[position + 1]

  function applyDraft(draft: Draft) {
    const merge = mergeDraft(form.getValues(), draft.context)
    // Keeping the defaults leaves them at the stored version, so the form reads dirty and Discard goes back to it.
    form.reset(merge.fields, { keepDefaultValues: true })
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
  function showFirstError(errors: FieldErrors<Fields>) {
    const failing = SECTIONS.find((s) => errors[s])
    if (failing) setSection(failing)
  }

  return (
    <FormProvider {...form}>
      <FormMetaContext.Provider value={meta}>
        {!started && readOnly && (
          <p className="rounded-xl border border-border-panel bg-white px-6 py-10 text-center font-body text-[0.9375rem] text-gray">
            {t('businessContext.empty')}
          </p>
        )}

        {!started && !readOnly && (
          <section
            aria-labelledby="bc-start-title"
            className="flex flex-col items-center gap-5 rounded-xl border border-border-panel bg-white px-6 py-14 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-cyan/15 text-nav-active-bg" aria-hidden="true">
              <UploadFileIcon />
            </span>
            <div className="flex max-w-[34rem] flex-col gap-2">
              <h2 id="bc-start-title" className="font-title text-[1.375rem] leading-tight text-navy">
                {t('businessContext.start.title')}
              </h2>
              <p className="font-body text-[0.9375rem] leading-[1.5] text-gray">{t('businessContext.start.description')}</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button size="lg" onClick={() => onImportOpenChange(true)}>
                {t('businessContext.start.import')}
              </Button>
              <button
                type="button"
                onClick={onStart}
                className="cursor-pointer rounded-md px-2 py-1 font-body text-[0.875rem] text-gray underline-offset-4 hover:text-navy hover:underline focus-ring"
              >
                {t('businessContext.start.manual')}
              </button>
            </div>
          </section>
        )}

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
