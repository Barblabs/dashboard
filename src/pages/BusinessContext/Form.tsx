import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
  type FieldErrors,
  type FieldPathByValue,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  CONCERNS,
  DATA_CATEGORIES,
  EMPLOYEE_RANGES,
  ENVIRONMENTS,
  LIMITS,
  ORGANIZATION_TYPES,
  REGULATIONS,
  DOWNTIMES,
  IMPACTS,
  REVENUE_RANGES,
  RISK_APPETITES,
  SECTORS,
  useAssetNamesQuery,
  type BusinessContext,
  valueAt,
  type BusinessContextFields,
  type Draft,
  type Section,
  type SaveBusinessContext,
} from '../../api/businessContext'
import { Button } from '../../components/ui/Button'
import { CloseIcon, UploadFileIcon } from '../../components/ui/icons'
import { Input } from '../../components/ui/Input'
import { Tab, TabList, TabPanel, Tabs } from '../../components/ui/Tabs'
import { CountriesField, CountryField, MultiSelectField, SelectField, TagField, TextAreaField } from './controls'
import { ImportDialog } from './ImportDialog'
import { SaveStatus } from './SaveStatus'
import { canonicalDomain, mergeDraft } from './model'
import { businessContextSchema, type ValidationKey } from './schema'

type Fields = BusinessContextFields

const SECTIONS: Section[] = ['profile', 'geography', 'operations', 'footprint', 'risk']

interface Meta {
  filled: Set<string>
  readOnly: boolean
}

const MetaContext = createContext<Meta>({ filled: new Set(), readOnly: true })

function useMeta(path: string) {
  const { filled, readOnly } = useContext(MetaContext)
  return { suggested: filled.has(path), readOnly }
}

function useErrorText() {
  const { t } = useTranslation()
  return (message: string | undefined, max: number) => (message ? t(message as ValidationKey, { max }) : undefined)
}

function TextAt({
  name,
  label,
  placeholder,
  max,
  rows,
}: {
  name: FieldPathByValue<Fields, string>
  label: string
  placeholder?: string
  max: number
  rows?: number
}) {
  const meta = useMeta(name)
  const errorText = useErrorText()
  return (
    <Controller
      name={name}
      render={({ field, fieldState }) => (
        <TextAreaField
          label={label}
          placeholder={placeholder}
          max={max}
          rows={rows}
          value={field.value as string}
          onChange={field.onChange}
          error={errorText(fieldState.error?.message, max)}
          {...meta}
        />
      )}
    />
  )
}

function MultiAt<T extends string>({
  name,
  label,
  options,
  labelOf,
}: {
  name: FieldPathByValue<Fields, T[]>
  label: string
  options: readonly T[]
  labelOf: (code: T) => string
}) {
  const meta = useMeta(name)
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <MultiSelectField label={label} options={options} labelOf={labelOf} value={field.value as T[]} onChange={field.onChange} {...meta} />
      )}
    />
  )
}

function SelectAt<T extends string>({
  name,
  label,
  options,
  labelOf,
  emptyLabel,
  hint,
  hideLabel,
}: {
  name: FieldPathByValue<Fields, T | ''>
  label: string
  options: readonly T[]
  labelOf: (code: T) => string
  emptyLabel?: string
  hint?: string
  hideLabel?: boolean
}) {
  const meta = { ...useMeta(name), hideLabel }
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <SelectField
          label={label}
          options={options}
          labelOf={labelOf}
          emptyLabel={emptyLabel}
          hint={hint}
          value={field.value as T | ''}
          onChange={field.onChange}
          {...meta}
        />
      )}
    />
  )
}

function TagsAt({
  name,
  label,
  placeholder,
  suggestions,
  canonical,
  hideLabel,
}: {
  name: FieldPathByValue<Fields, string[]>
  label: string
  placeholder?: string
  suggestions?: string[]
  canonical?: (entry: string) => { value: string } | { error: string }
  hideLabel?: boolean
}) {
  const meta = { ...useMeta(name), hideLabel }
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <TagField
          label={label}
          placeholder={placeholder}
          suggestions={suggestions}
          canonical={canonical}
          value={field.value as string[]}
          onChange={field.onChange}
          {...meta}
        />
      )}
    />
  )
}

const ROW = 'grid gap-5 md:grid-cols-2'

function Profile() {
  const { t } = useTranslation()
  return (
    <>
      <TextAt
        name="profile.summary"
        label={t('businessContext.fields.summary.label')}
        placeholder={t('businessContext.fields.summary.placeholder')}
        max={LIMITS.summary}
        rows={4}
      />
      <MultiAt
        name="profile.sectors"
        label={t('businessContext.fields.sectors')}
        options={SECTORS}
        labelOf={(c) => t(`businessContext.vocab.sectors.${c}`)}
      />
      <div className="grid gap-5 md:grid-cols-3">
        <SelectAt
          name="profile.organization_type"
          label={t('businessContext.fields.organizationType')}
          options={ORGANIZATION_TYPES}
          labelOf={(c) => t(`businessContext.vocab.organizationTypes.${c}`)}
        />
        <SelectAt
          name="profile.employees"
          label={t('businessContext.fields.employees')}
          options={EMPLOYEE_RANGES}
          labelOf={(c) => t(`businessContext.vocab.employees.${c}`)}
        />
        <SelectAt
          name="profile.annual_revenue"
          label={t('businessContext.fields.annualRevenue')}
          options={REVENUE_RANGES}
          labelOf={(c) => t(`businessContext.vocab.revenue.${c}`)}
        />
      </div>
      <div className={ROW}>
        <TextAt name="profile.mission" label={t('businessContext.fields.mission')} max={LIMITS.statement} />
        <TextAt name="profile.vision" label={t('businessContext.fields.vision')} max={LIMITS.statement} />
      </div>
    </>
  )
}

function Geography() {
  const { t } = useTranslation()
  const hq = useMeta('geography.headquarters')
  const countries = useMeta('geography.countries')
  return (
    <div className={ROW}>
      <Controller
        name="geography.headquarters"
        render={({ field }) => (
          <CountryField label={t('businessContext.fields.headquarters')} value={field.value as string} onChange={field.onChange} {...hq} />
        )}
      />
      <Controller
        name="geography.countries"
        render={({ field }) => (
          <CountriesField
            label={t('businessContext.fields.countries.label')}
            placeholder={t('businessContext.fields.countries.placeholder')}
            value={field.value as string[]}
            onChange={field.onChange}
            {...countries}
          />
        )}
      />
    </div>
  )
}

function CriticalServices() {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const { suggested, readOnly } = useMeta('operations.critical_services')
  const { control } = useFormContext<Fields>()
  const { fields, append, remove } = useFieldArray({ control, name: 'operations.critical_services' })
  const assetNames = useAssetNamesQuery()

  return (
    <div className={`flex flex-col gap-2 ${suggested ? '-ml-3 border-l-2 border-cyan pl-[10px]' : ''}`}>
      <span className={`font-body font-semibold ${readOnly ? 'text-[0.8125rem] text-gray' : 'text-[0.875rem] text-navy'}`}>
        {t('businessContext.fields.criticalServices.label')}
      </span>
      {readOnly && fields.length === 0 && <p className="font-body text-[0.9375rem] text-muted-bg">—</p>}
      {fields.map((item, index) =>
        readOnly ? (
          <ShownService key={item.id} index={index} />
        ) : (
          <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border-panel p-3">
            <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-4">
              <Controller
                name={`operations.critical_services.${index}.name`}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <Input
                      value={field.value as string}
                      onChange={field.onChange}
                      placeholder={t('businessContext.fields.criticalServices.namePlaceholder')}
                      aria-label={t('businessContext.fields.criticalServices.name')}
                      aria-invalid={Boolean(fieldState.error)}
                      className="font-semibold"
                    />
                    {fieldState.error && (
                      <p className="font-body text-[0.75rem] text-critical">{errorText(fieldState.error.message, LIMITS.entry)}</p>
                    )}
                  </div>
                )}
              />
              <div className="md:col-span-2">
                <TagsAt
                  name={`operations.critical_services.${index}.assets`}
                  label={t('businessContext.fields.criticalServices.assets')}
                  placeholder={t('businessContext.fields.criticalServices.assetsPlaceholder')}
                  suggestions={assetNames.data}
                  hideLabel
                />
              </div>
              <Controller
                name={`operations.critical_services.${index}.description`}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <Input
                      value={field.value as string}
                      onChange={field.onChange}
                      placeholder={t('businessContext.fields.criticalServices.descriptionPlaceholder')}
                      aria-label={t('businessContext.fields.criticalServices.description')}
                      aria-invalid={Boolean(fieldState.error)}
                    />
                    {fieldState.error && (
                      <p className="font-body text-[0.75rem] text-critical">{errorText(fieldState.error.message, LIMITS.statement)}</p>
                    )}
                  </div>
                )}
              />
              <SelectAt
                name={`operations.critical_services.${index}.impact`}
                label={t('businessContext.fields.criticalServices.impact')}
                emptyLabel={`${t('businessContext.fields.criticalServices.impact')}…`}
                options={IMPACTS}
                labelOf={(c) => t(`businessContext.vocab.impact.${c}`)}
                hideLabel
              />
              <SelectAt
                name={`operations.critical_services.${index}.max_downtime`}
                label={t('businessContext.fields.criticalServices.maxDowntime')}
                emptyLabel={`${t('businessContext.fields.criticalServices.maxDowntime')}…`}
                options={DOWNTIMES}
                labelOf={(c) => t(`businessContext.vocab.downtime.${c}`)}
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
  const { t } = useTranslation()
  const { control } = useFormContext<Fields>()
  const service = useWatch({ control, name: `operations.critical_services.${index}` })
  const tolerance = [
    service.impact && t(`businessContext.vocab.impact.${service.impact}`),
    service.max_downtime && t(`businessContext.vocab.downtime.${service.max_downtime}`),
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
      <MultiAt
        name="operations.data_categories"
        label={t('businessContext.fields.dataCategories')}
        options={DATA_CATEGORIES}
        labelOf={(c) => t(`businessContext.vocab.dataCategories.${c}`)}
      />
      <MultiAt
        name="operations.regulations"
        label={t('businessContext.fields.regulations')}
        options={REGULATIONS}
        labelOf={(c) => t(`businessContext.vocab.regulations.${c}`)}
      />
      <MultiAt
        name="operations.environments"
        label={t('businessContext.fields.environments')}
        options={ENVIRONMENTS}
        labelOf={(c) => t(`businessContext.vocab.environments.${c}`)}
      />
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
        <TagsAt
          name="footprint.domains"
          label={t('businessContext.fields.domains.label')}
          placeholder={t('businessContext.fields.domains.placeholder')}
          canonical={domain}
        />
        <TagsAt
          name="footprint.brands"
          label={t('businessContext.fields.brands.label')}
          placeholder={t('businessContext.fields.brands.placeholder')}
        />
      </div>
      <div className={ROW}>
        <TagsAt
          name="footprint.technologies"
          label={t('businessContext.fields.technologies.label')}
          placeholder={t('businessContext.fields.technologies.placeholder')}
        />
        <TagsAt
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
        <SelectAt
          name="risk.appetite"
          label={t('businessContext.fields.appetite')}
          hint={t('businessContext.fields.appetiteHint')}
          options={RISK_APPETITES}
          labelOf={(c) => t(`businessContext.vocab.appetite.${c}`)}
        />
        <MultiAt
          name="risk.concerns"
          label={t('businessContext.fields.concerns')}
          options={CONCERNS}
          labelOf={(c) => t(`businessContext.vocab.concerns.${c}`)}
        />
      </div>
      <TextAt
        name="risk.past_incidents"
        label={t('businessContext.fields.pastIncidents.label')}
        placeholder={t('businessContext.fields.pastIncidents.placeholder')}
        max={LIMITS.narrative}
      />
      <div className={ROW}>
        <TextAt
          name="risk.constraints"
          label={t('businessContext.fields.constraints.label')}
          placeholder={t('businessContext.fields.constraints.placeholder')}
          max={LIMITS.narrative}
        />
        <TextAt
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
  const meta = useMemo<Meta>(() => ({ filled, readOnly }), [filled, readOnly])
  const dirty = form.formState.isDirty
  const saving = save.isPending
  const position = SECTIONS.indexOf(section)
  const previous = SECTIONS[position - 1]
  const next = SECTIONS[position + 1]

  function applyDraft(draft: Draft) {
    const merge = mergeDraft(form.getValues(), draft.context)
    for (const path of merge.filled) {
      form.setValue(path as FieldPathByValue<Fields, string>, valueAt(merge.fields, path) as string, {
        shouldDirty: true,
      })
    }
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
      <MetaContext.Provider value={meta}>
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
      </MetaContext.Provider>
    </FormProvider>
  )
}
