import { useTranslation } from 'react-i18next'
import { MultiSelectField, SelectField } from '../fields'
import { ROW } from './layout'

export function Geography() {
  const { t } = useTranslation()
  return (
    <div className={ROW}>
      <SelectField name="geography.headquarters" vocab="countries" label={t('businessContext.fields.headquarters')} />
      <MultiSelectField
        name="geography.countries"
        vocab="countries"
        label={t('businessContext.fields.countries.label')}
        placeholder={t('businessContext.fields.countries.placeholder')}
      />
    </div>
  )
}
