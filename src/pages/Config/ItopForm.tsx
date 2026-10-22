import { zodResolver } from '@hookform/resolvers/zod'
import type { ParseKeys } from 'i18next'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useConnectMutation, useTestConnectionMutation } from '../../api/queries'
import { ApiError } from '../../api/client'
import type { CmdbTestResult } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'

// Los mensajes son claves de traducción: el texto se resuelve al pintar, en el idioma activo.
const credentialsSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'config.form.url.required')
    .regex(/^https?:\/\/.+/, 'config.form.url.scheme'),
  user: z.string().trim().min(1, 'config.form.user.required'),
  // La contraseña se envía tal cual: los espacios pueden ser parte de ella.
  password: z.string().refine((value) => value.trim() !== '', 'config.form.password.required'),
})

type Credentials = z.infer<typeof credentialsSchema>

const TEST_ERROR_KEYS = {
  missing_rest_profile: 'config.form.testErrors.missingRestProfile',
} as const

type KnownTestErrorCode = keyof typeof TEST_ERROR_KEYS

function isKnownTestErrorCode(code: string | undefined): code is KnownTestErrorCode {
  return code !== undefined && Object.prototype.hasOwnProperty.call(TEST_ERROR_KEYS, code)
}

interface Props {
  initialUrl?: string
  initialUser?: string
  onBack: () => void
  onConnected: () => void
}

const RESULT = 'rounded-md px-4 py-3 font-body text-[14px] leading-[1.4]'
const RESULT_OK = `${RESULT} border border-nav-active-bg bg-nav-active-bg/6 text-nav-active-bg`
const RESULT_ERROR = `${RESULT} border border-critical bg-critical/5 text-critical`

export function ItopForm({ initialUrl = '', initialUser = '', onBack, onConnected }: Props) {
  const { t } = useTranslation()
  const testMutation = useTestConnectionMutation()
  const connectMutation = useConnectMutation()

  const {
    register,
    handleSubmit,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { url: initialUrl, user: initialUser, password: '' },
    // Se valida al salir del campo y el error desaparece en cuanto se vuelve a escribir.
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  })

  const isTesting = testMutation.isPending
  const isConnecting = connectMutation.isPending
  const busy = isTesting || isConnecting
  const actionsDisabled = busy || !watch('password')

  const handleTest = handleSubmit((credentials) => {
    connectMutation.reset()
    testMutation.mutate(credentials)
  })

  const handleConnect = handleSubmit(async (credentials) => {
    // mutateAsync y no mutate: al conectar la página puede desmontar el formulario
    // antes de que corran los callbacks por llamada, y onConnected debe ejecutarse igual.
    const connected = await connectMutation.mutateAsync(credentials).then(
      () => true,
      () => false,
    )
    if (connected) onConnected()
  })

  function errorText(message: string | undefined) {
    return message && t(message as ParseKeys)
  }

  function testErrorText(error: Error) {
    return error instanceof ApiError && error.kind === 'network'
      ? t('config.form.result.testNetworkError')
      : t('config.form.result.testFailed')
  }

  // Un backend sin códigos, o con uno nuevo, sigue mostrando su propio mensaje.
  function failureText(result: CmdbTestResult, credentials: Credentials) {
    if (isKnownTestErrorCode(result.code)) {
      return t(TEST_ERROR_KEYS[result.code], { user: credentials.user })
    }
    return result.error ?? t('config.form.result.testFailed')
  }

  const result =
    connectMutation.isError ? { ok: false, text: t('config.form.result.connectFailed') }
    : testMutation.isError ? { ok: false, text: testErrorText(testMutation.error) }
    : testMutation.data?.ok ? { ok: true, text: t('config.form.result.success') }
    : testMutation.data ? { ok: false, text: failureText(testMutation.data, testMutation.variables) }
    : null

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 rounded-xl border border-border-panel bg-white p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-title text-[20px] leading-[1.2] text-navy">{t('config.form.title')}</h3>
        <button
          type="button"
          className="cursor-pointer p-0 font-body text-[14px] whitespace-nowrap text-gray underline underline-offset-2 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          onClick={onBack}
        >
          {t('config.form.back')}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <Field
          label={t('config.form.url.label')}
          help={t('config.form.url.help')}
          error={errorText(errors.url?.message)}
        >
          <Input
            type="url"
            placeholder="http://10.0.0.5:8000"
            autoComplete="off"
            disabled={busy}
            {...register('url', { onChange: () => clearErrors('url') })}
          />
        </Field>

        <Field
          label={t('config.form.user.label')}
          help={t('config.form.user.help')}
          error={errorText(errors.user?.message)}
        >
          <Input
            type="text"
            placeholder="barb-reader"
            autoComplete="username"
            disabled={busy}
            {...register('user', { onChange: () => clearErrors('user') })}
          />
        </Field>

        <Field
          label={t('config.form.password.label')}
          help={t('config.form.password.help')}
          error={errorText(errors.password?.message)}
        >
          <Input
            type="password"
            autoComplete="new-password"
            disabled={busy}
            {...register('password', { onChange: () => clearErrors('password') })}
          />
        </Field>
      </div>

      {result && (
        <div className={result.ok ? RESULT_OK : RESULT_ERROR}>
          {result.ok ? '✓' : '✗'} {result.text}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" loading={isTesting} disabled={actionsDisabled} onClick={handleTest}>
          {isTesting ? t('config.form.actions.testing') : t('config.form.actions.test')}
        </Button>
        <Button loading={isConnecting} disabled={actionsDisabled} onClick={handleConnect}>
          {isConnecting ? t('config.form.actions.connecting') : t('config.form.actions.connect')}
        </Button>
      </div>
    </div>
  )
}
