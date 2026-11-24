import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useValidationText } from '../../i18n/validation'
import { z } from 'zod'
import { completeNewPassword } from '../../auth/cognito'
import { completeSignIn } from '../../auth/session'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { cognitoErrorKey } from './cognitoErrorKey'

// Messages are translation keys: the text is resolved at render time, in the active language.
const newPwSchema = z
  .object({
    newPassword: z.string().min(1, 'login.newPassword.required'),
    // An empty confirmation can't match a password either.
    confirmPassword: z.string().min(1, 'login.newPassword.mismatch'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'login.newPassword.mismatch',
  })
type NewPwFields = z.infer<typeof newPwSchema>

export function NewPasswordForm() {
  const { t } = useTranslation()
  const validationText = useValidationText()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<NewPwFields>({
    resolver: zodResolver(newPwSchema),
  })

  async function onSubmit({ newPassword }: NewPwFields) {
    setServerError(null)
    try {
      await completeNewPassword(newPassword)
      const failure = await completeSignIn()
      if (failure) setServerError(t(failure))
    } catch (err) {
      setServerError(t(cognitoErrorKey(err)))
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => { void handleSubmit(onSubmit)(e) }}
      className="flex w-full max-w-[420px] flex-col gap-[18px] rounded-xl border border-border-panel bg-white px-5 pt-6 pb-6 md:px-8 md:pt-8 md:pb-7"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="font-title text-[1.625rem] leading-[1.15] text-navy">
          {t('login.newPassword.title')}
        </h1>
        <p className="font-body text-[0.9375rem] leading-[1.4] text-gray">
          {t('login.newPassword.subtitle')}
        </p>
      </div>

      {serverError && (
        <Alert tone="error">{serverError}</Alert>
      )}

      <Field
        label={t('login.newPassword.label')}
        help={t('login.newPassword.policy')}
        error={validationText(errors.newPassword?.message)}
      >
        <PasswordInput
          autoComplete="new-password"
          autoFocus
          {...register('newPassword')}
        />
      </Field>

      <Field
        label={t('login.newPassword.confirmLabel')}
        error={validationText(errors.confirmPassword?.message)}
      >
        <PasswordInput
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
      </Field>

      <Button type="submit" variant="secondary" loading={isSubmitting} className="w-full justify-center">
        {isSubmitting ? t('login.newPassword.submitting') : t('login.newPassword.submit')}
      </Button>
    </form>
  )
}
