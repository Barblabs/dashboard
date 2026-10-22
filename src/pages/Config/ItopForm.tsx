import { zodResolver } from '@hookform/resolvers/zod'
import type { ParseKeys } from 'i18next'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  useConnectMutation,
  useTestConnectionMutation,
  type CmdbCredentials,
} from '../../api/cmdb'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Panel, PanelTitle } from '../../components/ui/Panel'
import { codeKey, requestErrorKey } from '../../i18n/errors'

// Messages are translation keys: the text is resolved at render time, in the active language.
const credentialsSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'config.form.url.required')
    .regex(/^https?:\/\/.+/, 'config.form.url.scheme'),
  user: z.string().trim().min(1, 'config.form.user.required'),
  // The password is sent as is: spaces may be part of it.
  password: z.string().refine((value) => value.trim() !== '', 'config.form.password.required'),
})

type Credentials = z.infer<typeof credentialsSchema>

interface Props {
  initialValues: Pick<CmdbCredentials, 'url' | 'user'>
  onBack: () => void
  onConnected: () => void
}

const RESULT = 'rounded-md px-4 py-3 font-body text-[14px] leading-[1.4]'
const RESULT_OK = `${RESULT} border border-nav-active-bg bg-nav-active-bg/6 text-nav-active-bg`
const RESULT_ERROR = `${RESULT} border border-critical bg-critical/5 text-critical`

export function ItopForm({ initialValues, onBack, onConnected }: Props) {
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
    defaultValues: { ...initialValues, password: '' },
    // Validate on blur; the error disappears as soon as the user types again.
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

  // mutateAsync rather than mutate: on connect the page may unmount the form before
  // per-call callbacks run, and onConnected must still fire. The failure is rendered
  // from connectMutation.isError, so the rejection needs no handling here.
  const handleConnect = handleSubmit((credentials) =>
    connectMutation.mutateAsync(credentials).then(onConnected, () => {}),
  )

  function errorText(message: string | undefined) {
    return message && t(message as ParseKeys)
  }

  function resultOf(): { ok: boolean; text: string } | null {
    if (connectMutation.isError) {
      const key = requestErrorKey(connectMutation.error, {
        fallback: 'config.form.result.connectFailed',
      })
      return { ok: false, text: t(key, { user: connectMutation.variables.user }) }
    }
    if (testMutation.isError) {
      const key = requestErrorKey(testMutation.error, {
        fallback: 'config.form.result.testFailed',
        network: 'config.form.result.testNetworkError',
      })
      return { ok: false, text: t(key, { user: testMutation.variables.user }) }
    }
    const test = testMutation.data
    if (!test) return null
    if (test.ok) return { ok: true, text: t('config.form.result.success') }
    // A backend without codes, or with a new one, still shows its own message.
    const key = codeKey(test.code)
    if (key) return { ok: false, text: t(key, { user: testMutation.variables.user }) }
    return { ok: false, text: test.error ?? t('config.form.result.testFailed') }
  }

  const result = resultOf()

  return (
    <Panel className="gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <PanelTitle>{t('config.form.title')}</PanelTitle>
        <button
          type="button"
          className="cursor-pointer p-0 font-body text-[14px] whitespace-nowrap text-gray underline underline-offset-2 hover:text-navy focus-ring"
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
    </Panel>
  )
}
