import { zodResolver } from '@hookform/resolvers/zod'
import type { CognitoUser } from 'amazon-cognito-identity-js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { completeNewPassword } from '../../auth/cognito'
import { completeSignIn } from '../../auth/session'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { cognitoErrorKey } from './cognitoErrorKey'

const newPwSchema = z.object({
  newPassword: z.string().min(1),
})
type NewPwFields = z.infer<typeof newPwSchema>

interface NewPasswordFormProps {
  cognitoUser: CognitoUser
}

export function NewPasswordForm({ cognitoUser }: NewPasswordFormProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<NewPwFields>({
    resolver: zodResolver(newPwSchema),
  })

  async function onSubmit({ newPassword }: NewPwFields) {
    setServerError(null)
    try {
      await completeNewPassword(cognitoUser, newPassword)
      const failure = await completeSignIn()
      if (failure) setServerError(t(failure))
    } catch (err) {
      setServerError(t(cognitoErrorKey(err)))
    }
  }

  return (
    <form
      onSubmit={(e) => { void handleSubmit(onSubmit)(e) }}
      className="flex w-[420px] flex-col gap-[18px] rounded-xl border border-border-panel bg-white px-8 pb-7 pt-8"
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="font-body text-[0.875rem] font-semibold text-navy">
          {t('login.newPassword.label')}
        </label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
        />
        <p className="font-body text-[0.8125rem] leading-[1.4] text-gray">
          {t('login.newPassword.policy')}
        </p>
      </div>

      <Button type="submit" variant="secondary" size="lg" loading={isSubmitting} className="w-full justify-center">
        {isSubmitting ? t('login.newPassword.submitting') : t('login.newPassword.submit')}
      </Button>
    </form>
  )
}
