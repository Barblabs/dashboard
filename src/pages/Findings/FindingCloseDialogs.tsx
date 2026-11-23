import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  CLOSE_REASONS,
  closesUntil,
  useCloseFindingMutation,
  useReopenFindingMutation,
  type CloseReason,
  type ManualClose,
} from '../../api/findingCloses'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog, DialogLayout, TargetModal } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { RadioGroup } from '../../components/ui/RadioGroup'
import type { DialogTarget } from '../../components/ui/useDialogTarget'
import { requestErrorText } from '../../i18n/errors'
import { useValidationText } from '../../i18n/validation'
import { hasWhy, whySchema } from './why'
import { WhyField } from './WhyField'

/** The Finding a dialog closes or reopens. */
export interface FindingRef {
  id: string
  cve: string
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')

/** A day as a date input holds it, `YYYY-MM-DD`, where the User is. */
function dayFromToday(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The start of the day where the User is, with their offset, as the backend takes a time. */
function startOfDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  const offset = -new Date(year, month - 1, date).getTimezoneOffset()
  return `${day}T00:00:00${offset < 0 ? '-' : '+'}${pad(Math.abs(offset) / 60)}:${pad(Math.abs(offset) % 60)}`
}

// Days as `YYYY-MM-DD` compare as text. Today has begun, so the first day ahead is tomorrow.
const closeSchema = z
  .object({ reason: z.enum(CLOSE_REASONS), note: whySchema, reopenOn: z.string() })
  .superRefine(({ reason, reopenOn }, ctx) => {
    if (!closesUntil(reason)) return
    if (reopenOn === '') ctx.addIssue({ code: 'custom', path: ['reopenOn'], message: 'findings.close.reopenAtRequired' })
    else if (reopenOn < dayFromToday(1)) ctx.addIssue({ code: 'custom', path: ['reopenOn'], message: 'findings.close.reopenAtPast' })
  })
type CloseFields = z.infer<typeof closeSchema>

export function CloseFindingDialog({ dialog }: { dialog: DialogTarget<FindingRef> }) {
  return (
    <TargetModal dialog={dialog} width="md">
      {(finding) => <CloseBody finding={finding} onDone={dialog.close} />}
    </TargetModal>
  )
}

function CloseBody({ finding, onDone }: { finding: FindingRef; onDone: () => void }) {
  const { t } = useTranslation()
  const validationText = useValidationText()
  const close = useCloseFindingMutation()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<CloseFields>({
    resolver: zodResolver(closeSchema),
    defaultValues: { reason: 'remediated', note: '', reopenOn: '' },
  })
  const reason = watch('reason')
  const note = watch('note')

  const pickReopenOn = (days: number) => setValue('reopenOn', dayFromToday(days), { shouldValidate: isSubmitted })

  const onSubmit = handleSubmit((fields) => {
    const body: ManualClose = closesUntil(fields.reason)
      ? { reason: fields.reason, note: fields.note, reopen_at: startOfDay(fields.reopenOn) }
      : { reason: fields.reason, note: fields.note }
    close.mutate({ findingId: finding.id, close: body }, { onSuccess: onDone })
  })

  return (
    <DialogLayout
      title={t('findings.close.title', { cve: finding.cve })}
      error={requestErrorText(close.error, t, { fallback: 'findings.close.failed' })}
      onSubmit={() => void onSubmit()}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onDone}>
            {t('findings.close.cancel')}
          </Button>
          <Button type="submit" size="sm" loading={close.isPending} disabled={!hasWhy(note)}>
            {t('findings.close.action')}
          </Button>
        </>
      }
    >
      <RadioGroup<CloseReason>
        label={t('findings.close.reason')}
        value={reason}
        onValueChange={(next) => setValue('reason', next, { shouldValidate: isSubmitted })}
        disabled={close.isPending}
        options={CLOSE_REASONS.map((value) => ({
          value,
          label: t(`findings.closeReasons.${value}`),
          description: t(`findings.closeAfter.${value}`),
        }))}
      />
      {closesUntil(reason) && (
        <div className="flex flex-col gap-2">
          <Field
            label={t('findings.close.reopenAt')}
            help={t('findings.close.reopenAtHelp')}
            error={validationText(errors.reopenOn?.message)}
          >
            <Input type="date" min={dayFromToday(1)} disabled={close.isPending} {...register('reopenOn')} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={close.isPending} onClick={() => pickReopenOn(30)}>
              {t('findings.close.in30')}
            </Button>
            <Button variant="secondary" size="sm" disabled={close.isPending} onClick={() => pickReopenOn(90)}>
              {t('findings.close.in90')}
            </Button>
          </div>
        </div>
      )}
      <WhyField registration={register('note')} value={note} error={errors.note?.message} disabled={close.isPending} />
    </DialogLayout>
  )
}

export function ReopenFindingDialog({ dialog }: { dialog: DialogTarget<FindingRef> }) {
  return <TargetModal dialog={dialog}>{(finding) => <ReopenBody finding={finding} onDone={dialog.close} />}</TargetModal>
}

function ReopenBody({ finding, onDone }: { finding: FindingRef; onDone: () => void }) {
  const { t } = useTranslation()
  const reopen = useReopenFindingMutation()
  return (
    <ConfirmDialog
      title={t('findings.reopen.title', { cve: finding.cve })}
      text={t('findings.reopen.text')}
      cancelLabel={t('findings.reopen.cancel')}
      confirmLabel={t('findings.reopen.confirm')}
      pending={reopen.isPending}
      error={requestErrorText(reopen.error, t, { fallback: 'findings.reopen.failed' })}
      onConfirm={() => reopen.mutate(finding.id, { onSuccess: onDone })}
      onCancel={onDone}
    />
  )
}
