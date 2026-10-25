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
import { codeKey, requestErrorText } from '../../i18n/errors'

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
  // "update" replaces the login of the connected source; "connect" creates the source.
  mode: 'connect' | 'update'
  initialValues: Pick<CmdbLogin, 'url' | 'user'>
  onBack: () => void
  onSaved: () => void
}

const PROVIDER = 'itop'

const RESULT = 'rounded-md px-4 py-3 font-body text-[14px] leading-[1.4]'
const RESULT_OK = `${RESULT} border border-nav-active-bg bg-nav-active-bg/6 text-nav-active-bg`
const RESULT_ERROR = `${RESULT} border border-critical bg-critical/5 text-critical`

export function ItopForm({ mode, initialValues, onBack, onSaved }: Props) {
  const { t } = useTranslation()
  const testMutation = useTestLoginMutation()
  const connectMutation = useConnectMutation()
  const updateMutation = useUpdateLoginMutation()
  const isUpdate = mode === 'update'

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
  const isSaving = connectMutation.isPending || updateMutation.isPending
  const busy = isTesting || isSaving
  const actionsDisabled = busy || !watch('password')

  const handleTest = handleSubmit((login) => {
    connectMutation.reset()
    updateMutation.reset()
    testMutation.mutate({ provider: PROVIDER, ...login })
  })

  // mutateAsync rather than mutate: on save the page may unmount the form before
  // per-call callbacks run, and onSaved must still fire. The failure is rendered
  // from the mutation's error, so the rejection needs no handling here.
  const handleSave = handleSubmit((login) => {
    const saved = isUpdate
      ? updateMutation.mutateAsync(login)
      : connectMutation.mutateAsync({ provider: PROVIDER, ...login })
    return saved.then(onSaved, () => {})
  })

  function errorText(message: string | undefined) {
    return message && t(message as ParseKeys)
  }

  function resultOf(): { ok: boolean; text: string } | null {
    const saveMutation = isUpdate ? updateMutation : connectMutation
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
    // A code this build does not know yet still shows the backend's own message.
    const key = codeKey(test.code)
    if (key) return { ok: false, text: t(key, { user: testMutation.variables.user }) }
    return { ok: false, text: test.error || t('config.form.result.testFailed') }
  }

  function saveLabel() {
    if (isUpdate) {
      return isSaving ? t('config.form.actions.saving') : t('config.form.actions.save')
    }
    return isSaving ? t('config.form.actions.connecting') : t('config.form.actions.connect')
  }

  const result = resultOf()

  return (
    <Panel className="gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <PanelTitle>{isUpdate ? t('config.form.editTitle') : t('config.form.title')}</PanelTitle>
        <button
          type="button"
          className="cursor-pointer p-0 font-body text-[14px] whitespace-nowrap text-gray underline underline-offset-2 hover:text-navy focus-ring"
          onClick={onBack}
        >
          {isUpdate ? t('config.form.cancel') : t('config.form.back')}
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
        <Button loading={isSaving} disabled={actionsDisabled} onClick={handleSave}>
          {saveLabel()}
        </Button>
      </div>
    </Panel>
  )
}
