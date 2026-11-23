import type { UseMutationResult } from '@tanstack/react-query'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EXPOSURES,
  INFORMATION_CLASSIFICATIONS,
  type Asset,
  type Exposure,
  type InformationClassification,
} from '../../api/assets'
import { errorCode } from '../../api/client'
import type { DeclarationChange } from '../../api/declarations'
import { useExposureMutation, type ExposureChange, type ExposureSaved } from '../../api/exposure'
import { useInformationClassificationMutation } from '../../api/informationClassification'
import { useCanEdit } from '../../auth/permissions'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import type { DialogTarget } from '../../components/ui/useDialogTarget'
import { useToast } from '../../components/ui/useToast'
import { useDateFormat, useListFormat } from '../../i18n/format'
import { exposureLabel, informationClassificationLabel, osLabel } from './assetText'

/**
 * One Asset opened from its record, or the queue of Active Assets that needed triage as they
 * were when the queue opened: answering one does not reshuffle the rest.
 */
export type AssetTriageTarget = { mode: 'single'; asset: Asset } | { mode: 'queue'; assets: Asset[] }

type Section = 'exposure' | 'informationClassification'

const FOOTER = 'flex flex-wrap items-center justify-end gap-2 border-t border-border-panel px-6 py-4'
const EYEBROW = 'font-body text-[0.75rem] font-semibold text-gray'

/**
 * Lets the User see where an Asset's Exposure and Information Classification come from and, as a
 * Customer Admin, declare or clear each of them.
 */
export function AssetTriageSheet({ dialog }: { dialog: DialogTarget<AssetTriageTarget> }) {
  const target = dialog.target
  return (
    <Sheet open={dialog.open} onClose={dialog.close}>
      {target?.mode === 'queue' && <Queue assets={target.assets} onClose={dialog.close} />}
      {target?.mode === 'single' && <Single asset={target.asset} />}
    </Sheet>
  )
}

function Single({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  return (
    <>
      <SheetHeader title={t('config.triage.sheet.singleTitle')} />
      <AssetStep asset={asset} />
    </>
  )
}

function Queue({ assets, onClose }: { assets: Asset[]; onClose: () => void }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  // The Assets where at least one value was saved, however many times.
  const [triaged, setTriaged] = useState<ReadonlySet<number>>(new Set())
  const [exposureSaved, setExposureSaved] = useState(false)
  const total = assets.length
  const asset = assets[index]

  const onSaved = (assetId: number, section: Section) => {
    setTriaged((current) => new Set(current).add(assetId))
    if (section === 'exposure') setExposureSaved(true)
  }

  return (
    <>
      <SheetHeader
        title={t('config.triage.sheet.queueTitle')}
        eyebrow={asset && t('config.triage.sheet.position', { index: index + 1, total })}
      />
      {asset ? (
        // Keyed by Asset, so each one starts from its own Declarations with no leftover choice or error.
        <AssetStep
          key={asset.id}
          asset={asset}
          queue={{ onSaved: (section) => onSaved(asset.id, section), onNext: () => setIndex((current) => current + 1) }}
        />
      ) : (
        <Summary triaged={triaged.size} total={total} exposureSaved={exposureSaved} onClose={onClose} />
      )}
    </>
  )
}

/** The Saved mark confirms a success; only the warning that the rescore failed reaches a toast. */
function useNotRescoredToast() {
  const { t } = useTranslation()
  const { show } = useToast()
  return ({ asset, rescored }: ExposureSaved, { value }: ExposureChange) => {
    if (rescored) return
    // Clearing falls back to the imported value, which the Asset as saved carries.
    const values = { name: asset.name, value: exposureLabel(t, value ?? asset.exposure.imported) }
    const kind = value === null ? 'cleared' : 'declared'
    show({ tone: 'warning', text: t(`config.exposure.toast.${kind}NotRescored`, values) })
  }
}

/** One section's answer: the choice on screen, its save, and what the save left behind. */
interface DeclarationSection<V extends string> {
  /** The Declaration in use; `null` when there is none. */
  declared: V | null
  choice: V | null
  choose: (value: V) => void
  /** `null` clears the Declaration. */
  save: (value: V | null) => void
  pending: 'declare' | 'clear' | null
  /** `retry` for a failed save the User can retry; a 409 means the Asset turned Inactive and locks the whole step. */
  failure: 'retry' | 'turnedInactive' | null
  /** How many times it was saved, so the Saved mark re-enters on each save. */
  saves: number
  /** A choice that differs from the Declaration and was not saved. */
  unsaved: boolean
}

/*
 * Each section owns its choice, mutation and error, so a failed save of one leaves the other
 * untouched. The step keeps the mutations and states to itself: a 409 from either locks both
 * sections, and the queue's footer names the sections left unsaved.
 */
function useDeclarationSection<V extends string, Saved>(
  asset: Asset,
  declared: V | null,
  mutation: UseMutationResult<Saved, Error, DeclarationChange<V>>,
  onSaved: (saved: Saved) => void,
): DeclarationSection<V> {
  const [choice, setChoice] = useState(declared)
  const [saves, setSaves] = useState(0)
  return {
    declared,
    choice,
    choose: (value) => {
      setChoice(value)
      mutation.reset()
    },
    save: (value) =>
      mutation.mutate(
        { asset, value },
        {
          onSuccess: (saved) => {
            // The choice follows the saved value, so clearing empties it.
            setChoice(value)
            setSaves((current) => current + 1)
            onSaved(saved)
          },
        },
      ),
    pending: mutation.isPending ? (mutation.variables.value === null ? 'clear' : 'declare') : null,
    failure: mutation.isError ? (errorCode(mutation.error) === 'asset_inactive' ? 'turnedInactive' : 'retry') : null,
    saves,
    unsaved: choice !== null && choice !== declared,
  }
}

type StepLock = 'turnedInactive' | 'viewer' | 'inactive' | null

/*
 * A 409 means the Asset turned Inactive meanwhile. Its error replaces the reason the step is
 * locked: the User must learn their save didn't happen. A Viewer never sends, so never sees it.
 */
function stepLockOf({
  sections,
  canEdit,
  active,
}: {
  sections: Pick<DeclarationSection<string>, 'failure'>[]
  canEdit: boolean
  active: boolean
}): StepLock {
  if (sections.some((section) => section.failure === 'turnedInactive')) return 'turnedInactive'
  if (!canEdit) return 'viewer'
  if (!active) return 'inactive'
  return null
}

interface QueueStep {
  onSaved: (section: Section) => void
  onNext: () => void
}

function LockedReason({ children }: { children: string }) {
  return <p className="font-body text-[0.8125rem] leading-[1.4] text-gray">{children}</p>
}

function AssetStep({ asset: opened, queue }: { asset: Asset; queue?: QueueStep }) {
  const { t } = useTranslation()
  const canEdit = useCanEdit()
  const formatList = useListFormat()
  /*
   * The Asset as its sections last saved it: a save keeps the step open, so its provenance must
   * follow. Each save patches only its own field: both sections can save at once, and the
   * response that lands last would otherwise bring back the other field as it was before.
   */
  const [asset, setAsset] = useState(opened)
  const exposureMutation = useExposureMutation({ onSaved: useNotRescoredToast() })
  const informationClassificationMutation = useInformationClassificationMutation()

  const exposure = useDeclarationSection(
    asset,
    asset.exposure.source === 'declared' ? asset.exposure.value : null,
    exposureMutation,
    (saved) => {
      setAsset((current) => ({ ...current, exposure: saved.asset.exposure }))
      queue?.onSaved('exposure')
    },
  )
  const informationClassification = useDeclarationSection(
    asset,
    asset.information_classification.value,
    informationClassificationMutation,
    (saved) => {
      setAsset((current) => ({ ...current, information_classification: saved.information_classification }))
      queue?.onSaved('informationClassification')
    },
  )

  const lock = stepLockOf({ sections: [exposure, informationClassification], canEdit, active: asset.active })
  const locked = lock !== null

  const unsaved = [
    exposure.unsaved && t('config.inventory.record.exposure'),
    informationClassification.unsaved && t('config.inventory.record.informationClassification'),
  ].filter((name) => name !== false)

  return (
    <div className="flex min-h-0 flex-1 animate-fade-in flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        <AssetHeading asset={asset} />
        {lock === 'turnedInactive' ? (
          <Alert tone="error">{t('config.triage.sheet.turnedInactive')}</Alert>
        ) : (
          lock && <LockedReason>{t(`config.triage.sheet.${lock}Reason`)}</LockedReason>
        )}
        <ExposureSection asset={asset} section={exposure} locked={locked} />
        <InformationClassificationSection asset={asset} section={informationClassification} locked={locked} />
      </div>
      {queue && (
        <div className={FOOTER}>
          {!locked && unsaved.length > 0 && (
            <p className="mr-auto animate-fade-in font-body text-[0.8125rem] text-gray">
              {t('config.triage.sheet.notSaved', { sections: formatList(unsaved) })}
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            // Moving on mid-save would hide a failed save's error, and drop the step before it counts the Asset as triaged.
            disabled={exposure.pending !== null || informationClassification.pending !== null}
            onClick={queue.onNext}
          >
            {t('config.triage.sheet.next')}
          </Button>
        </div>
      )}
    </div>
  )
}

function AssetHeading({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const facts = [
    t(`config.inventory.kind.${asset.kind}`),
    osLabel(asset),
    asset.area?.name ?? t('config.inventory.noArea'),
    t('config.triage.sheet.criticality', {
      criticality: t(`config.inventory.criticality.${asset.criticality ?? 'unknown'}`),
    }),
  ]
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[1rem] font-medium break-all text-navy">{asset.name}</span>
      <span className="font-body text-[0.8125rem] text-gray">{facts.join(' · ')}</span>
    </div>
  )
}

interface SectionProps<V extends string> {
  asset: Asset
  section: DeclarationSection<V>
  /** Shows only where the value comes from, with no way to change it. */
  locked: boolean
}

function ExposureSection({ asset, section, locked }: SectionProps<Exposure>) {
  const { t } = useTranslation()
  const { imported } = asset.exposure
  return (
    <TriageSection title={t('config.inventory.record.exposure')} saves={section.saves}>
      <ExposureProvenance asset={asset} />
      {!locked && (
        <DeclarationForm
          name={`exposure-${asset.id}`}
          legend={t('config.exposure.sheet.question')}
          options={EXPOSURES.map((value) => ({
            value,
            label: exposureLabel(t, value),
            help: t(`config.exposure.sheet.help.${value}`),
          }))}
          section={section}
          clearLabel={
            imported
              ? t('config.exposure.sheet.useImported', { value: exposureLabel(t, imported) })
              : t('config.triage.sheet.clear')
          }
          declareLabel={t('config.exposure.sheet.declare')}
        >
          {section.choice === 'internal' && section.declared !== 'internal' && (
            <Alert tone="info" className="animate-fade-in">
              {t('config.exposure.sheet.internalWarning')}
            </Alert>
          )}
        </DeclarationForm>
      )}
    </TriageSection>
  )
}

function InformationClassificationSection({ asset, section, locked }: SectionProps<InformationClassification>) {
  const { t } = useTranslation()
  return (
    <TriageSection title={t('config.inventory.record.informationClassification')} saves={section.saves}>
      <InformationClassificationProvenance asset={asset} />
      {!locked && (
        <DeclarationForm
          name={`information-classification-${asset.id}`}
          legend={t('config.informationClassification.sheet.question')}
          options={INFORMATION_CLASSIFICATIONS.map((value) => ({
            value,
            label: informationClassificationLabel(t, value),
            help: t(`config.informationClassification.sheet.help.${value}`),
          }))}
          section={section}
          clearLabel={t('config.triage.sheet.clear')}
          declareLabel={t('config.informationClassification.sheet.declare')}
        />
      )}
    </TriageSection>
  )
}

/** A titled section of the step, marked Saved after each successful save. */
function TriageSection({ title, saves, children }: { title: string; saves: number; children: ReactNode }) {
  const { t } = useTranslation()
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 border-t border-border-panel pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id={titleId} className={EYEBROW}>
          {title}
        </h3>
        {/* The live region stays mounted so each save is announced; the mark inside re-enters. */}
        <span role="status">
          {saves > 0 && (
            <span
              key={saves}
              className="inline-flex animate-fade-in items-center gap-1 font-body text-[0.75rem] font-semibold text-nav-active-bg motion-safe:animate-pop-in"
            >
              <CheckIcon size={12} />
              {t('config.triage.sheet.saved')}
            </span>
          )}
        </span>
      </div>
      {children}
    </section>
  )
}

/** Where the Exposure can come from, the one in use marked. */
function ExposureProvenance({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const exposure = asset.exposure
  const { source, imported } = exposure

  const declaredText =
    exposure.source === 'declared'
      ? t('config.triage.sheet.declaredBy', {
          value: exposureLabel(t, exposure.value),
          user: exposure.declared_by,
          date: formatDate(exposure.declared_at),
        })
      : t('config.exposure.sheet.nothingDeclared')
  const importedText = imported
    ? t('config.exposure.sheet.importedFrom', { value: exposureLabel(t, imported) })
    : t('config.inventory.exposure.unknown')

  return (
    <dl className="flex flex-col gap-1.5 font-body text-[0.8125rem] leading-[1.4]">
      <ProvenanceRow label={t('config.triage.sheet.declared')} inUse={source === 'declared'}>
        {declaredText}
      </ProvenanceRow>
      <ProvenanceRow label={t('config.exposure.sheet.imported')} inUse={source === 'imported'}>
        {importedText}
      </ProvenanceRow>
    </dl>
  )
}

/** Only a Declaration gives an Information Classification, so there is a single source to show. */
function InformationClassificationProvenance({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const classification = asset.information_classification
  return (
    <dl className="flex flex-col gap-1.5 font-body text-[0.8125rem] leading-[1.4]">
      {classification.value ? (
        <ProvenanceRow label={t('config.triage.sheet.declared')} inUse>
          {t('config.triage.sheet.declaredBy', {
            value: informationClassificationLabel(t, classification.value),
            user: classification.declared_by,
            date: formatDate(classification.declared_at),
          })}
        </ProvenanceRow>
      ) : (
        <ProvenanceRow label={informationClassificationLabel(t, null)} inUse={false}>
          {t('config.exposure.sheet.nothingDeclared')}
        </ProvenanceRow>
      )}
    </dl>
  )
}

function ProvenanceRow({ label, inUse, children }: { label: string; inUse: boolean; children: string }) {
  const { t } = useTranslation()
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 ${inUse ? 'border-navy bg-white' : 'border-border-panel bg-panel'}`}
    >
      <div className="flex min-w-0 flex-col">
        <dt className="font-semibold text-navy">{label}</dt>
        <dd className="break-words text-gray">{children}</dd>
      </div>
      {inUse && (
        <span className="shrink-0 rounded-sm bg-navy px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white">
          {t('config.triage.sheet.inUse')}
        </span>
      )}
    </div>
  )
}

interface ChoiceOption<V extends string> {
  value: V
  label: string
  help: string
}

interface DeclarationFormProps<V extends string> {
  name: string
  legend: string
  options: ChoiceOption<V>[]
  section: DeclarationSection<V>
  clearLabel: string
  declareLabel: string
  /** Shown under the choices, above the save error. */
  children?: ReactNode
}

/** The choices, the save error and the action row: clear on the left when declared, declare on the right. */
function DeclarationForm<V extends string>({
  name,
  legend,
  options,
  section,
  clearLabel,
  declareLabel,
  children,
}: DeclarationFormProps<V>) {
  const { t } = useTranslation()
  const { declared, choice, choose, save, pending, failure } = section
  return (
    <div className="flex flex-col gap-3">
      <ChoiceCards
        name={name}
        legend={legend}
        options={options}
        value={choice}
        disabled={pending !== null}
        onChange={choose}
      />
      {children}
      {failure === 'retry' && <Alert tone="error">{t('config.triage.sheet.saveFailed')}</Alert>}
      <div className="flex justify-end gap-2">
        {declared && (
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto"
            loading={pending === 'clear'}
            disabled={pending === 'declare'}
            onClick={() => save(null)}
          >
            {pending === 'clear' ? t('config.triage.sheet.clearing') : clearLabel}
          </Button>
        )}
        <Button
          size="sm"
          loading={pending === 'declare'}
          disabled={choice === null || choice === declared || pending === 'clear'}
          onClick={() => choice && save(choice)}
        >
          {pending === 'declare' ? t('config.triage.sheet.declaring') : declareLabel}
        </Button>
      </div>
    </div>
  )
}

interface ChoiceCardsProps<V extends string> {
  name: string
  legend: string
  options: ChoiceOption<V>[]
  value: V | null
  onChange: (value: V) => void
  disabled: boolean
}

// Native radios: arrow keys and the group's accessible name come for free.
function ChoiceCards<V extends string>({ name, legend, options, value, onChange, disabled }: ChoiceCardsProps<V>) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend className="mb-1 font-body text-[0.875rem] font-semibold text-navy">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border-panel bg-white px-3 py-2.5 transition-[border-color,background-color] duration-150 ease-out hover:border-navy/50 has-checked:border-navy has-checked:bg-navy/[0.03] has-disabled:cursor-not-allowed has-disabled:opacity-60 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-0.5 size-3.5 accent-navy outline-none"
          />
          <span className="flex flex-col font-body leading-[1.35]">
            <span className="text-[0.875rem] font-semibold text-navy">{option.label}</span>
            <span className="text-[0.75rem] text-gray">{option.help}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

interface SummaryProps {
  triaged: number
  total: number
  exposureSaved: boolean
  onClose: () => void
}

function Summary({ triaged, total, exposureSaved, onClose }: SummaryProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 animate-fade-in flex-col items-start gap-4 px-6 py-8">
      <div role="status" className="flex flex-col gap-1.5 font-body">
        <p className="text-[1rem] font-semibold text-navy">{t('config.triage.sheet.summary', { triaged, total })}</p>
        {exposureSaved && (
          <p className="text-[0.875rem] leading-[1.45] text-gray">{t('config.triage.sheet.summaryDetail')}</p>
        )}
      </div>
      <Button size="sm" onClick={onClose}>
        {t('config.triage.sheet.done')}
      </Button>
    </div>
  )
}
