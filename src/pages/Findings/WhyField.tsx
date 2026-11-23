import type { UseFormRegisterReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field } from '../../components/ui/Field'
import { Textarea } from '../../components/ui/Textarea'
import { useValidationText } from '../../i18n/validation'

interface Props {
  registration: UseFormRegisterReturn
  /** The text typed so far, for the count. */
  value: string
  error: string | undefined
  disabled: boolean
}

export function WhyField({ registration, value, error, disabled }: Props) {
  const { t } = useTranslation()
  const validationText = useValidationText()
  return (
    <Field
      label={t('findings.why.label')}
      help={<span className="tabular-nums">{t('findings.why.count', { count: value.length })}</span>}
      error={validationText(error)}
    >
      <Textarea rows={3} required disabled={disabled} {...registration} />
    </Field>
  )
}
