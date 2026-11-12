import { useTranslation } from 'react-i18next'
import { CriticalServices } from '../CriticalServices'
import { MultiSelectField } from '../fields'

export function Operations() {
  const { t } = useTranslation()
  return (
    <>
      <CriticalServices />
      <MultiSelectField name="operations.data_categories" vocab="dataCategories" label={t('businessContext.fields.dataCategories')} />
      <MultiSelectField name="operations.regulations" vocab="regulations" label={t('businessContext.fields.regulations')} />
      <MultiSelectField name="operations.environments" vocab="environments" label={t('businessContext.fields.environments')} />
    </>
  )
}
