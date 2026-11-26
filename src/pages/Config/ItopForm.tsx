import { zodResolver } from '@hookform/resolvers/zod'
import type { ParseKeys } from 'i18next'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useValidationText } from '../../i18n/validation'
import { z } from 'zod'
import {
  useConnectMutation,
  useTestLoginMutation,
  useUpdateLoginMutation,
  type CmdbLogin,
} from '../../api/cmdb'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
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

type ItopFormMode = 'connect' | 'update'

type ItopCheck =
  | { status: 'editing' }
  | { status: 'testing' }
  | { status: 'tested'; ok: boolean; text: string }
  | { status: 'saving' }
  | { status: 'saveFailed'; text: string }

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

export function ItopForm({
  mode,
  initialValues,
  onBack,
  onSaved,
  className = '',
  titleId,
}: Props) {
  const { t } = useTranslation()
  const validationText = useValidationText()
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

  const handleTest = handleSubmit((login) => {
    saveMutation.reset()
    testMutation.mutate(login)
  })

  const handleSave = handleSubmit((login) => {
    testMutation.reset()
    saveMutation.mutate(login, { onSuccess: onSaved })
  })

  function edit(field: keyof Credentials) {
    clearErrors(field)
    testMutation.reset()
    saveMutation.reset()
  }

  function checkOf(): ItopCheck {
    if (saveMutation.isPending) return { status: 'saving' }
    if (saveMutation.isError) {
      const text = requestErrorText(
        saveMutation.error,
        t,
        { fallback: 'config.form.result.connectFailed' },
        { user: saveMutation.variables.user },
      )
      return { status: 'saveFailed', text }
    }
    if (testMutation.isPending) return { status: 'testing' }
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
      return { status: 'tested', ok: false, text }
    }
    const test = testMutation.data
    if (!test) return { status: 'editing' }
    if (test.ok) return { status: 'tested', ok: true, text: t('config.form.result.success') }
    const text = translatedOrBackendMessage(test, t, 'config.form.result.testFailed', {
      user: testMutation.variables.user,
    })
    return { status: 'tested', ok: false, text }
  }

  const check = checkOf()
  const isTesting = check.status === 'testing'
  const isSaving = check.status === 'saving'
  const busy = isTesting || isSaving
  const result =
    check.status === 'tested' ? check : check.status === 'saveFailed' ? { ok: false, text: check.text } : null

  return (
    <Panel className={`gap-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <PanelTitle id={titleId}>{t(copy.title)}</PanelTitle>
        <Button variant="link" size="sm" onClick={onBack}>
          {t(copy.back)}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <Field
          label={t('config.form.url.label')}
          help={t('config.form.url.help')}
          error={validationText(errors.url?.message)}
        >
          <Input
            type="url"
            placeholder="http://192.0.2.10:8000"
            autoComplete="off"
            disabled={busy}
            {...register('url', { onChange: () => edit('url') })}
          />
        </Field>

        <Field
          label={t('config.form.user.label')}
          help={t('config.form.user.help')}
          error={validationText(errors.user?.message)}
        >
          <Input
            type="text"
            placeholder="barb-reader"
            autoComplete="username"
            disabled={busy}
            {...register('user', { onChange: () => edit('user') })}
          />
        </Field>

        <Field
          label={t('config.form.password.label')}
          error={validationText(errors.password?.message)}
        >
          <PasswordInput
            autoComplete="new-password"
            disabled={busy}
            {...register('password', { onChange: () => edit('password') })}
          />
        </Field>
      </div>

      {result && (
        <Alert tone={result.ok ? 'success' : 'error'} className="animate-fade-in">
          <span aria-hidden="true">{result.ok ? '✓' : '✗'}</span> {result.text}
        </Alert>
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
