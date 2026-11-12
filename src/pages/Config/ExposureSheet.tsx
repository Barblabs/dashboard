import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EXPOSURES, type Asset, type Exposure } from '../../api/assets'
import { errorCode } from '../../api/client'
import { useExposureMutation, type ExposureChange, type ExposureSaved } from '../../api/exposure'
import { useCanEdit } from '../../auth/permissions'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import type { DialogTarget } from '../../components/ui/useDialogTarget'
import { useToast } from '../../components/ui/useToast'
import { useDateFormat } from '../../i18n/format'
import { exposureLabel, osLabel } from './assetText'

/**
 * One Asset opened from its cell, or the queue of Active Assets with Unknown Exposure as they
 * were when the queue opened: answering one does not reshuffle the rest.
 */
export type ExposureSheetTarget = { mode: 'single'; asset: Asset } | { mode: 'queue'; assets: Asset[] }

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'
const FOOTER = 'flex flex-wrap items-center justify-end gap-2 border-t border-border-panel px-6 py-4'

/** Lets the User see where an Asset's Exposure comes from and, as a Customer Admin, declare it. */
export function ExposureSheet({ dialog }: { dialog: DialogTarget<ExposureSheetTarget> }) {
  const target = dialog.target
  return (
    <Sheet open={dialog.open} onClose={dialog.close}>
      {target?.mode === 'queue' && <Queue assets={target.assets} onClose={dialog.close} />}
      {target?.mode === 'single' && <Single asset={target.asset} onClose={dialog.close} />}
    </Sheet>
  )
}

function Single({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <SheetHeader title={t('config.exposure.sheet.singleTitle')} />
      <AssetStep asset={asset} queue={false} onDone={onClose} />
    </>
  )
}

function Queue({ assets, onClose }: { assets: Asset[]; onClose: () => void }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(0)
  const total = assets.length
  const asset = assets[index]

  const advance = (didAnswer: boolean) => {
    setIndex((current) => current + 1)
    if (didAnswer) setAnswered((current) => current + 1)
  }

  return (
    <>
      <SheetHeader
        title={t('config.exposure.sheet.queueTitle')}
        eyebrow={asset && t('config.exposure.sheet.position', { index: index + 1, total })}
      />
      <div className="h-1 shrink-0 bg-panel" aria-hidden="true">
        <div
          className={`h-full origin-left bg-nav-active-bg transition-transform duration-300 ${EASE}`}
          style={{ transform: `scaleX(${index / total})` }}
        />
      </div>
      {asset ? (
        // Keyed by Asset, so each one starts from its own Declaration with no leftover error.
        <AssetStep key={asset.id} asset={asset} queue onDone={advance} />
      ) : (
        <Summary answered={answered} total={total} onClose={onClose} />
      )}
    </>
  )
}

/*
 * A queue confirms each answer with its progress bar and summary, so only the warning that the
 * rescore failed reaches it; a single Asset also confirms its success with a toast.
 */
function useSavedToast(queue: boolean) {
  const { t } = useTranslation()
  const { show } = useToast()
  return ({ asset, rescored }: ExposureSaved, { exposure }: ExposureChange) => {
    if (rescored && queue) return
    // Clearing falls back to the imported value, which the Asset as saved carries.
    const values = { name: asset.name, value: exposureLabel(t, exposure ?? asset.exposure.imported) }
    const kind = exposure === null ? 'cleared' : 'declared'
    show(
      rescored
        ? { tone: 'success', text: t(`config.exposure.toast.${kind}`, values) }
        : { tone: 'warning', text: t(`config.exposure.toast.${kind}NotRescored`, values) },
    )
  }
}

interface AssetStepProps {
  asset: Asset
  queue: boolean
  /** Whether the User answered, rather than skipping or moving past an Asset they can't declare. */
  onDone: (answered: boolean) => void
}

// The mutation lives here, above both views, so a 409 can turn the form into the locked view.
function AssetStep({ asset, queue, onDone }: AssetStepProps) {
  const { t } = useTranslation()
  const canEdit = useCanEdit()
  const change = useExposureMutation({ onSaved: useSavedToast(queue) })

  // A 409 means the Asset turned Inactive meanwhile: it is now as read-only as any Inactive one.
  const turnedInactive = errorCode(change.error) === 'asset_inactive'
  const lockedReason = !canEdit
    ? t('config.exposure.sheet.viewerReason')
    : !asset.active || turnedInactive
      ? t('config.exposure.sheet.inactiveReason')
      : null

  if (lockedReason) {
    // The error replaces the reason: the User must learn their save didn't happen.
    const notice = turnedInactive ? (
      <Alert tone="error">{t('config.exposure.sheet.turnedInactive')}</Alert>
    ) : (
      <p className="font-body text-[0.8125rem] leading-[1.4] text-gray">{lockedReason}</p>
    )
    return (
      <StepLayout
        asset={asset}
        footer={
          queue && (
            <Button variant="secondary" size="sm" onClick={() => onDone(false)}>
              {t('config.exposure.sheet.next')}
            </Button>
          )
        }
      >
        {notice}
      </StepLayout>
    )
  }
  return <DeclareStep asset={asset} queue={queue} change={change} onDone={onDone} />
}

interface DeclareStepProps extends AssetStepProps {
  change: ReturnType<typeof useExposureMutation>
}

function DeclareStep({ asset, queue, change, onDone }: DeclareStepProps) {
  const { t } = useTranslation()
  const declared = asset.exposure.source === 'declared' ? asset.exposure.value : null
  const [choice, setChoice] = useState<Exposure | null>(declared)
  const pending = change.isPending ? (change.variables.exposure === null ? 'clear' : 'declare') : null

  const save = (exposure: Exposure | null) =>
    change.mutate({ asset, exposure }, { onSuccess: () => onDone(true) })

  return (
    <StepLayout
      asset={asset}
      footer={
        <>
          {declared && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto"
              loading={pending === 'clear'}
              disabled={pending === 'declare'}
              onClick={() => save(null)}
            >
              {pending === 'clear'
                ? t('config.exposure.sheet.clearing')
                : t('config.exposure.sheet.useImported', { value: exposureLabel(t, asset.exposure.imported) })}
            </Button>
          )}
          {queue && (
            <Button variant="secondary" size="sm" disabled={pending !== null} onClick={() => onDone(false)}>
              {t('config.exposure.sheet.skip')}
            </Button>
          )}
          <Button
            size="sm"
            loading={pending === 'declare'}
            disabled={choice === null || choice === declared || pending === 'clear'}
            onClick={() => choice && save(choice)}
          >
            {pending === 'declare'
              ? t('config.exposure.sheet.declaring')
              : t(queue ? 'config.exposure.sheet.declareAndNext' : 'config.exposure.sheet.declare')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <ExposureChoice
          name={`exposure-${asset.id}`}
          value={choice}
          disabled={pending !== null}
          onChange={(value) => {
            setChoice(value)
            change.reset()
          }}
        />
        {choice === 'internal' && declared !== 'internal' && (
          <Alert tone="info" className="animate-fade-in">
            {t('config.exposure.sheet.internalWarning')}
          </Alert>
        )}
        {change.error && <Alert tone="error">{t('config.exposure.sheet.saveFailed')}</Alert>}
      </div>
    </StepLayout>
  )
}

/** The Asset and where its Exposure comes from, then the step's own content and footer. */
function StepLayout({ asset, footer, children }: { asset: Asset; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 animate-fade-in flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
        <AssetHeading asset={asset} />
        <Provenance asset={asset} />
        {children}
      </div>
      {footer && <div className={FOOTER}>{footer}</div>}
    </div>
  )
}

function AssetHeading({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const facts = [
    t(`config.inventory.kind.${asset.kind}`),
    osLabel(asset),
    asset.area?.name ?? t('config.exposure.sheet.noArea'),
    t('config.exposure.sheet.criticality', {
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

/** Where the Exposure can come from, the one in use marked. */
function Provenance({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const { source, value, imported, declared_by, declared_at } = asset.exposure

  const declaredText =
    source === 'declared' && declared_by && declared_at
      ? t('config.exposure.sheet.declaredBy', {
          value: exposureLabel(t, value),
          user: declared_by,
          date: formatDate(declared_at),
        })
      : t('config.exposure.sheet.nothingDeclared')
  const importedText = imported
    ? t('config.exposure.sheet.importedFrom', { value: exposureLabel(t, imported) })
    : asset.kind === 'virtual_machine'
      ? t('config.exposure.sheet.unknownVirtualMachine')
      : t('config.exposure.sheet.unknownLocation')

  return (
    <dl className="flex flex-col gap-1.5 font-body text-[0.8125rem] leading-[1.4]">
      <ProvenanceRow label={t('config.exposure.sheet.declared')} inUse={source === 'declared'}>
        {declaredText}
      </ProvenanceRow>
      <ProvenanceRow label={t('config.exposure.sheet.imported')} inUse={source === 'imported'}>
        {importedText}
      </ProvenanceRow>
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
        <span className="shrink-0 rounded-sm bg-navy px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-[0.04em] text-white uppercase">
          {t('config.exposure.sheet.inUse')}
        </span>
      )}
    </div>
  )
}

interface ExposureChoiceProps {
  name: string
  value: Exposure | null
  onChange: (value: Exposure) => void
  disabled: boolean
}

// Native radios: arrow keys and the group's accessible name come for free.
function ExposureChoice({ name, value, onChange, disabled }: ExposureChoiceProps) {
  const { t } = useTranslation()
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend className="mb-1 font-body text-[0.875rem] font-semibold text-navy">
        {t('config.exposure.sheet.question')}
      </legend>
      {EXPOSURES.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border-panel bg-white px-3 py-2.5 transition-[border-color,background-color] duration-150 ease-out hover:border-navy/50 has-checked:border-navy has-checked:bg-navy/[0.03] has-disabled:cursor-not-allowed has-disabled:opacity-60 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy"
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="mt-0.5 size-3.5 accent-navy outline-none"
          />
          <span className="flex flex-col font-body leading-[1.35]">
            <span className="text-[0.875rem] font-semibold text-navy">{exposureLabel(t, option)}</span>
            <span className="text-[0.75rem] text-gray">{t(`config.exposure.sheet.help.${option}`)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function Summary({ answered, total, onClose }: { answered: number; total: number; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 animate-fade-in flex-col items-start gap-4 px-6 py-8">
      <span className="flex size-9 items-center justify-center rounded-full bg-nav-active-bg text-white">
        <CheckIcon size={16} />
      </span>
      <div role="status" className="flex flex-col gap-1.5 font-body">
        <p className="text-[1rem] font-semibold text-navy">
          {t('config.exposure.sheet.answered', { answered, total })}
        </p>
        <p className="text-[0.875rem] leading-[1.45] text-gray">
          {t('config.exposure.sheet.rescored')}
          {answered < total && ` ${t('config.exposure.sheet.skipped')}`}
        </p>
      </div>
      <Button size="sm" onClick={onClose}>
        {t('config.exposure.sheet.done')}
      </Button>
    </div>
  )
}
