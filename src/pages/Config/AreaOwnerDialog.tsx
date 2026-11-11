import { useId } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ParseKeys } from 'i18next'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useSetAreaOwnerMutation, type Area } from '../../api/areas'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { requestErrorText } from '../../i18n/errors'

// The owner is free text: the backend accepts any email, not only dashboard users.
const ownerSchema = z.object({ email: z.email('config.areas.owner.invalidEmail') })

type OwnerFields = z.infer<typeof ownerSchema>

interface Props {
  area: Area
  onClose: () => void
}

export function AreaOwnerDialog({ area, onClose }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const setOwner = useSetAreaOwnerMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OwnerFields>({
    resolver: zodResolver(ownerSchema),
    defaultValues: { email: area.owner_email ?? '' },
  })

  const save = (email: string | null) =>
    setOwner.mutate({ id: area.id, email }, { onSuccess: onClose })

  const onSubmit = handleSubmit(({ email }) => save(email))

  const errorText = setOwner.isError
    ? requestErrorText(setOwner.error, t, { fallback: 'config.areas.owner.saveFailed' })
    : null

  const removing = setOwner.isPending && setOwner.variables.email === null
  const saving = setOwner.isPending && !removing

  return (
    <Modal open onClose={onClose} labelledBy={titleId}>
      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="flex flex-col gap-5 p-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="font-title text-[1.25rem] leading-tight text-navy">
            {t('config.areas.owner.title', { area: area.name })}
          </h2>
          <p className="font-body text-[0.8125rem] text-gray">
            {t('config.areas.owner.description')}
          </p>
        </div>

        <Field
          label={t('config.areas.owner.email')}
          error={errors.email?.message && t(errors.email.message as ParseKeys)}
        >
          <Input
            type="email"
            placeholder="nombre@empresa.com"
            autoComplete="off"
            disabled={setOwner.isPending}
            {...register('email', { onChange: () => setOwner.reset() })}
          />
        </Field>

        {errorText && (
          <p
            role="alert"
            className="rounded-md border border-critical bg-critical/5 px-4 py-3 font-body text-[0.875rem] text-critical"
          >
            {errorText}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {area.owner_email && (
            <Button
              variant="ghost"
              size="sm"
              loading={removing}
              disabled={saving}
              onClick={() => save(null)}
            >
              {t('config.areas.owner.remove')}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('config.areas.owner.cancel')}
            </Button>
            <Button type="submit" size="sm" loading={saving} disabled={removing}>
              {saving ? t('config.areas.owner.saving') : t('config.areas.owner.save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
