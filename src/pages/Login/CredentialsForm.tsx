import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useValidationText } from '../../i18n/validation'
import { z } from 'zod'
import { signIn } from '../../auth/cognito'
import { completeSignIn } from '../../auth/session'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { cognitoErrorKey } from './cognitoErrorKey'

// Messages are translation keys: the text is resolved at render time, in the active language.
const credSchema = z.object({
  email: z.string().min(1, 'login.form.email.required').pipe(z.email('login.form.email.invalid')),
  password: z.string().min(1, 'login.form.password.required'),
})
type CredFields = z.infer<typeof credSchema>

interface CredFormProps {
  onNewPasswordRequired: () => void
}

export function CredentialsForm({ onNewPasswordRequired }: CredFormProps) {
  const { t } = useTranslation()
  const validationText = useValidationText()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<CredFields>({
    resolver: zodResolver(credSchema),
  })

  async function onSubmit({ email, password }: CredFields) {
    setServerError(null)
    try {
      if ((await signIn(email, password)) === 'newPasswordRequired') {
        onNewPasswordRequired()
        return
      }

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
          {t('login.form.title')}
        </h1>
        <p className="font-body text-[0.9375rem] leading-[1.4] text-gray">
          {t('login.form.access')}
        </p>
      </div>

      {serverError && (
        <Alert tone="error">{serverError}</Alert>
      )}

      <Field
        label={t('login.form.email.label')}
        error={validationText(errors.email?.message)}
      >
        <Input
          type="email"
          autoComplete="email"
          autoFocus
          placeholder={t('login.form.email.placeholder')}
          {...register('email')}
        />
      </Field>

      <Field
        label={t('login.form.password.label')}
        error={validationText(errors.password?.message)}
      >
        <PasswordInput
          autoComplete="current-password"
          placeholder="••••••••••••"
          {...register('password')}
        />
      </Field>

      <Button type="submit" variant="secondary" size="lg" loading={isSubmitting} className="w-full justify-center">
        {isSubmitting ? t('login.form.submitting') : t('login.form.submit')}
      </Button>

      <Alert tone="info">{t('login.form.notice')}</Alert>
    </form>
  )
}
