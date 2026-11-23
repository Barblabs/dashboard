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
import { requestErrorText } from '../../i18n/errors'
import { useDateFormat } from '../../i18n/format'
import { HEADING, WRITTEN } from './styles'
import { hasWhy, whySchema } from './why'
import { WhyField } from './WhyField'

const feedbackSchema = z.object({
  verdict: z.enum(VERDICTS),
  note: whySchema,
})
type FeedbackFields = z.infer<typeof feedbackSchema>

const VERDICT_MARK: Record<(typeof VERDICTS)[number], string> = {
  applies: '✓',
  should_be_earlier: '↑',
  should_be_later: '↓',
}

interface Props {
  order: CurrentOrder
  finding: Finding
}

/**
 * The User's say on the Finding's place, right after the reason for it: one choice, then the
 * Why the Prioritizer reads. What Users said before, on any Prioritization of the chain, follows.
 */
export function FeedbackSection({ order, finding }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const formatDate = useDateFormat()
  const record = useRecordFeedbackMutation(order.prioritization.id)
  const said = order.prioritization.feedback.filter((f) => f.finding_id === finding.finding_id)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FeedbackFields>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { note: '' },
  })
  const note = watch('note')
  const verdict = watch('verdict')

  const onSubmit = handleSubmit((data) =>
    record.mutate({ findingId: finding.finding_id, ...data }, { onSuccess: () => reset({ note: '' }) }),
  )

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-xl border border-border-panel bg-panel p-5">
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className={HEADING}>
          {t('findings.detail.feedback.question')}
        </h3>
        <p className="font-body text-[0.875rem] leading-[1.5] text-gray">{t('findings.detail.feedback.orderHint')}</p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        <div role="group" aria-labelledby={titleId} className="flex flex-wrap gap-2">
          {VERDICTS.map((v) => (
            <Button
              key={v}
              size="sm"
              variant={verdict === v ? 'primary' : 'secondary'}
              aria-pressed={verdict === v}
              disabled={record.isPending}
              onClick={() => {
                record.reset()
                setValue('verdict', v)
              }}
            >
              <span aria-hidden="true" className="mr-1.5">
                {VERDICT_MARK[v]}
              </span>
              {t(`findings.detail.feedback.verdicts.${v}`)}
            </Button>
          ))}
        </div>

        {verdict && (
          <div className="flex flex-col gap-3 rounded-lg bg-white p-4">
            <WhyField
              registration={register('note')}
              value={note}
              error={errors.note?.message}
              disabled={record.isPending}
            />
            {record.error && (
              <Alert tone="error">{requestErrorText(record.error, t, { fallback: 'findings.detail.feedback.failed' })}</Alert>
            )}
            <div>
              <Button type="submit" size="sm" loading={record.isPending} disabled={!hasWhy(note)}>
                {record.isPending ? t('findings.detail.feedback.sending') : t('findings.detail.feedback.submit')}
              </Button>
            </div>
          </div>
        )}
        {record.isSuccess && <Alert tone="success">{t('findings.detail.feedback.sent')}</Alert>}
      </form>

      <div className="flex flex-col gap-2 border-t border-border-row pt-4">
        <span className="font-body text-[0.875rem] font-semibold text-navy">
          {t('findings.detail.feedback.history', { count: said.length })}
        </span>
        {said.length === 0 ? (
          <p className="font-body text-[0.875rem] text-gray">{t('findings.detail.feedback.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {said.map((f) => (
              <li key={f.id} className="flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-body text-[0.875rem] font-semibold text-navy">
                    {t(`findings.detail.feedback.verdicts.${f.verdict}`)}
                  </span>
                  <span className="font-body text-[0.8125rem] text-gray">{formatDate(f.created_at)}</span>
                  {f.via_analista && <Badge variant="muted">{t('findings.detail.feedback.viaAnalista')}</Badge>}
                </span>
                {f.note && <p className={`${WRITTEN} text-navy`}>{f.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
