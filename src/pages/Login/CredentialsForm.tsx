import { zodResolver } from '@hookform/resolvers/zod'
import type { CognitoUser } from 'amazon-cognito-identity-js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { signIn } from '../../auth/cognito'
import { completeSignIn } from '../../auth/session'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { cognitoErrorKey } from './cognitoErrorKey'

const credSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
})
type CredFields = z.infer<typeof credSchema>

interface CredFormProps {
  onNewPasswordRequired: (cognitoUser: CognitoUser) => void
}

export function CredentialsForm({ onNewPasswordRequired }: CredFormProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<CredFields>({
    resolver: zodResolver(credSchema),
  })

  async function onSubmit({ email, password }: CredFields) {
    setServerError(null)
    try {
      const result = await signIn(email, password)

      if (result.kind === 'newPasswordRequired') {
        onNewPasswordRequired(result.cognitoUser)
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
      className="flex w-[420px] flex-col gap-[18px] rounded-xl border border-border-panel bg-white px-8 pb-7 pt-8"
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
        error={errors.email && (errors.email.type === 'too_small' ? t('login.form.email.required') : t('login.form.email.invalid'))}
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
        error={errors.password && t('login.form.password.required')}
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
