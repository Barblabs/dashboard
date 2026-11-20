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
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'
import { WRITTEN } from './styles'
import { hasWhy, whySchema } from './why'
import { WhyField } from './WhyField'

const feedbackSchema = z.object({
  verdict: z.enum(VERDICTS),
  note: whySchema,
})
type FeedbackFields = z.infer<typeof feedbackSchema>

interface Props {
  order: CurrentOrder
  finding: Finding
  /** Opens the close by hand, for a User who would have said it does not apply or is fixed; absent once closed. */
  onCloseFinding?: () => void
}

/** What Users said about the Finding, on any Prioritization of the chain, and a form to add to it. */
export function FeedbackSection({ order, finding, onCloseFinding }: Props) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const record = useRecordFeedbackMutation(order.prioritization.id)
  const said = order.prioritization.feedback.filter((f) => f.finding_id === finding.finding_id)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FeedbackFields>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { verdict: 'applies', note: '' },
  })
  const note = watch('note')

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
              {f.note && <p className={`${WRITTEN} text-navy`}>{f.note}</p>}
            </li>
          ))}
        </ul>
      )}

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field
          label={t('findings.detail.feedback.verdict')}
          help={t('findings.detail.feedback.orderHint')}
        >
          <Select disabled={record.isPending} {...register('verdict')}>
            {VERDICTS.map((verdict) => (
              <option key={verdict} value={verdict}>
                {t(`findings.detail.feedback.verdicts.${verdict}`)}
              </option>
            ))}
          </Select>
        </Field>
        {onCloseFinding && (
          <p className="font-body text-[0.8125rem] text-gray">
            {t('findings.detail.feedback.closeInstead')}{' '}
            <Button variant="link" size="sm" className="underline" onClick={onCloseFinding}>
              {t('findings.detail.feedback.closeLink')}
            </Button>
          </p>
        )}
        <WhyField
          registration={register('note')}
          value={note}
          error={errors.note?.message}
          disabled={record.isPending}
        />
        {record.isSuccess && <Alert tone="success">{t('findings.detail.feedback.sent')}</Alert>}
        {record.error && (
          <Alert tone="error">{requestErrorText(record.error, t, { fallback: 'findings.detail.feedback.failed' })}</Alert>
        )}
        <div>
          <Button type="submit" size="sm" loading={record.isPending} disabled={!hasWhy(note)}>
            {record.isPending ? t('findings.detail.feedback.sending') : t('findings.detail.feedback.submit')}
          </Button>
        </div>
      </form>
    </div>
  )
}
