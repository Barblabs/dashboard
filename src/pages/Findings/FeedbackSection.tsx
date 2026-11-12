import { useId } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  useRecordFeedbackMutation,
  VERDICTS,
  type CurrentOrder,
  type Finding,
} from '../../api/prioritizations'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FIELD_SURFACE } from '../../components/ui/fieldSurface'
import { Select } from '../../components/ui/Select'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'
import { WRITTEN } from './styles'

const FIELD_LABEL = 'font-body text-[0.875rem] font-semibold text-navy'

/** As long as the backend takes. */
const MAX_NOTE = 2000

const feedbackSchema = z.object({
  verdict: z.enum(VERDICTS),
  note: z.string().max(MAX_NOTE, 'findings.detail.feedback.noteTooLong'),
})
type FeedbackFields = z.infer<typeof feedbackSchema>

/** What Users said about the Finding, on any Prioritization of the chain, and a form to add to it. */
export function FeedbackSection({ order, finding }: { order: CurrentOrder; finding: Finding }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const record = useRecordFeedbackMutation(order.prioritization.id)
  const verdictId = useId()
  const noteId = useId()
  const said = order.prioritization.feedback.filter((f) => f.finding_id === finding.finding_id)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFields>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { verdict: 'applies', note: '' },
  })

  const onSubmit = handleSubmit((data) =>
    record.mutate({ findingId: finding.finding_id, ...data }, { onSuccess: () => reset() }),
  )

  return (
    <div className="flex flex-col gap-4">
      {said.length === 0 ? (
        <p className="text-[0.875rem] text-gray">{t('findings.detail.feedback.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {said.map((f) => (
            <li key={f.id} className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-body text-[0.875rem] font-semibold text-navy">
                  {t(`findings.detail.feedback.verdicts.${f.verdict}`)}
                </span>
                <span className="text-[0.75rem] text-gray">{formatDate(f.created_at)}</span>
                {f.via_analista && <Badge variant="muted">{t('findings.detail.feedback.viaAnalista')}</Badge>}
              </span>
              {f.note && <p className={WRITTEN}>{f.note}</p>}
            </li>
          ))}
        </ul>
      )}

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={verdictId} className={FIELD_LABEL}>
            {t('findings.detail.feedback.verdict')}
          </label>
          <Select id={verdictId} aria-describedby={`${verdictId}-hint`} disabled={record.isPending} {...register('verdict')}>
            {VERDICTS.map((verdict) => (
              <option key={verdict} value={verdict}>
                {t(`findings.detail.feedback.verdicts.${verdict}`)}
              </option>
            ))}
          </Select>
          <p id={`${verdictId}-hint`} className="font-body text-[0.75rem] leading-[1.4] text-gray">
            {t('findings.detail.feedback.orderHint')}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className={FIELD_LABEL}>
            {t('findings.detail.feedback.note')}
          </label>
          <textarea
            id={noteId}
            rows={3}
            disabled={record.isPending}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? `${noteId}-error` : undefined}
            {...register('note')}
            className={`${FIELD_SURFACE} resize-y px-3 py-2.5 text-[0.9375rem] leading-[1.5] focus:border-navy aria-invalid:border-critical`}
          />
          {errors.note?.message && (
            <p id={`${noteId}-error`} className="font-body text-[0.75rem] text-critical">
              {t(errors.note.message as 'findings.detail.feedback.noteTooLong')}
            </p>
          )}
        </div>
        {record.isSuccess && <Alert tone="success">{t('findings.detail.feedback.sent')}</Alert>}
        {record.error && (
          <Alert tone="error">{requestErrorText(record.error, t, { fallback: 'findings.detail.feedback.failed' })}</Alert>
        )}
        <div>
          <Button type="submit" size="sm" loading={record.isPending}>
            {record.isPending ? t('findings.detail.feedback.sending') : t('findings.detail.feedback.submit')}
          </Button>
        </div>
      </form>
    </div>
  )
}
