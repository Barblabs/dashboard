import { zodResolver } from '@hookform/resolvers/zod'
import type { ParseKeys } from 'i18next'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  useConnectMutation,
  useTestLoginMutation,
  useUpdateLoginMutation,
  type CmdbLogin,
} from '../../api/cmdb'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Panel, PanelTitle } from '../../components/ui/Panel'
import { translatedOrBackendMessage, requestErrorText } from '../../i18n/errors'

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

export type ItopFormMode = 'connect' | 'update'

interface Props {
  mode: ItopFormMode
  initialValues: Pick<CmdbLogin, 'url' | 'user'>
  onBack: () => void
  onSaved: () => void
  className?: string
  /** Lets a surrounding dialog name itself after the form title. */
  titleId?: string
}

const PROVIDER = 'itop'

const COPY = {
  connect: {
    title: 'config.form.title',
    back: 'config.form.back',
    save: 'config.form.actions.connect',
    saving: 'config.form.actions.connecting',
  },
  update: {
    title: 'config.form.editTitle',
    back: 'config.form.cancel',
    save: 'config.form.actions.save',
    saving: 'config.form.actions.saving',
  },
} as const satisfies Record<ItopFormMode, Record<string, ParseKeys>>

const RESULT = 'animate-fade-in rounded-md px-4 py-3 font-body text-[0.875rem] leading-[1.4]'
const RESULT_OK = `${RESULT} border border-nav-active-bg bg-nav-active-bg/6 text-nav-active-bg`
const RESULT_ERROR = `${RESULT} border border-critical bg-critical/5 text-critical`

export function ItopForm({
  mode,
  initialValues,
  onBack,
  onSaved,
  className = '',
  titleId,
}: Props) {
  const { t } = useTranslation()
  const testMutation = useTestLoginMutation(PROVIDER)
  const connectMutation = useConnectMutation(PROVIDER)
  const updateMutation = useUpdateLoginMutation()
  const saveMutation = mode === 'update' ? updateMutation : connectMutation
  const copy = COPY[mode]

  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { ...initialValues, password: '' },
    // Validate on blur; the error disappears as soon as the user types again.
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  })

  const isTesting = testMutation.isPending
  const isSaving = saveMutation.isPending
  const busy = isTesting || isSaving

  const handleTest = handleSubmit((login) => {
    saveMutation.reset()
    testMutation.mutate(login)
  })

  const handleSave = handleSubmit((login) => saveMutation.mutate(login, { onSuccess: onSaved }))

  function errorText(message: string | undefined) {
    return message && t(message as ParseKeys)
  }

  function resultOf(): { ok: boolean; text: string } | null {
    if (saveMutation.isError) {
      const text = requestErrorText(
        saveMutation.error,
        t,
        { fallback: 'config.form.result.connectFailed' },
        { user: saveMutation.variables.user },
      )
      return { ok: false, text }
    }
    if (testMutation.isError) {
      const text = requestErrorText(
        testMutation.error,
        t,
        {
          fallback: 'config.form.result.testFailed',
          network: 'config.form.result.testNetworkError',
        },
        { user: testMutation.variables.user },
      )
      return { ok: false, text }
    }
    const test = testMutation.data
    if (!test) return null
    if (test.ok) return { ok: true, text: t('config.form.result.success') }
    const text = translatedOrBackendMessage(test, t, 'config.form.result.testFailed', {
      user: testMutation.variables.user,
    })
    return { ok: false, text }
  }

  const result = resultOf()

  return (
    <Panel className={`gap-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <PanelTitle id={titleId}>{t(copy.title)}</PanelTitle>
        <button
          type="button"
          className="cursor-pointer p-0 font-body text-[0.875rem] whitespace-nowrap text-gray underline underline-offset-2 hover:text-navy focus-ring"
          onClick={onBack}
        >
          {t(copy.back)}
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
        <div
          role={result.ok ? 'status' : 'alert'}
          className={result.ok ? RESULT_OK : RESULT_ERROR}
        >
          <span aria-hidden="true">{result.ok ? '✓' : '✗'}</span> {result.text}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" loading={isTesting} disabled={busy} onClick={handleTest}>
          {isTesting ? t('config.form.actions.testing') : t('config.form.actions.test')}
        </Button>
        <Button loading={isSaving} disabled={busy} onClick={handleSave}>
          {isSaving ? t(copy.saving) : t(copy.save)}
        </Button>
      </div>
    </Panel>
  )
}
