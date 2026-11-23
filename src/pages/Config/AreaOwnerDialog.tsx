import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useValidationText } from '../../i18n/validation'
import { z } from 'zod'
import { useSetAreaOwnerMutation, type Area } from '../../api/areas'
import { Button } from '../../components/ui/Button'
import { DialogLayout, TargetModal } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import type { DialogTarget } from '../../components/ui/useDialogTarget'
import { requestErrorText } from '../../i18n/errors'

// The owner is free text: the backend accepts any email, not only dashboard users.
const ownerSchema = z.object({ email: z.email('config.areas.owner.invalidEmail') })

type OwnerFields = z.infer<typeof ownerSchema>

export function AreaOwnerDialog({ dialog }: { dialog: DialogTarget<Area> }) {
  return <TargetModal dialog={dialog}>{(area) => <AreaOwnerBody area={area} onClose={dialog.close} />}</TargetModal>
}

function AreaOwnerBody({ area, onClose }: { area: Area; onClose: () => void }) {
  const { t } = useTranslation()
  const validationText = useValidationText()
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

  const removing = setOwner.isPending && setOwner.variables.email === null
  const saving = setOwner.isPending && !removing

  return (
    <DialogLayout
      title={t('config.areas.owner.title', { area: area.name })}
      error={requestErrorText(setOwner.error, t, { fallback: 'config.areas.owner.saveFailed' })}
      onSubmit={handleSubmit(({ email }) => save(email))}
      actions={
        <>
          {area.owner_email && (
            <Button
              variant="ghost"
              size="sm"
              loading={removing}
              disabled={saving}
              className="mr-auto"
              onClick={() => save(null)}
            >
              {t('config.areas.owner.remove')}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('config.areas.owner.cancel')}
          </Button>
          <Button type="submit" size="sm" loading={saving} disabled={removing}>
            {saving ? t('config.areas.owner.saving') : t('config.areas.owner.save')}
          </Button>
        </>
      }
    >
      <Field
        label={t('config.areas.owner.email')}
        help={t('config.areas.owner.help')}
        error={validationText(errors.email?.message)}
      >
        <Input
          type="email"
          placeholder={t('login.form.email.placeholder')}
          autoComplete="off"
          disabled={setOwner.isPending}
          {...register('email', { onChange: () => setOwner.reset() })}
        />
      </Field>
    </DialogLayout>
  )
}
