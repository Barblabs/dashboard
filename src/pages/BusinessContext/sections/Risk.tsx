import { useTranslation } from 'react-i18next'
import { LIMITS } from '../../../api/businessContext'
import { MultiSelectField, SelectField, TextAreaField } from '../fields'
import { ROW } from './layout'

export function Risk() {
  const { t } = useTranslation()
  return (
    <>
      <div className={ROW}>
        <SelectField
          name="risk.appetite"
          vocab="appetite"
          label={t('businessContext.fields.appetite')}
          hint={t('businessContext.fields.appetiteHint')}
        />
        <MultiSelectField name="risk.concerns" vocab="concerns" label={t('businessContext.fields.concerns')} />
      </div>
      <TextAreaField
        name="risk.past_incidents"
        label={t('businessContext.fields.pastIncidents.label')}
        placeholder={t('businessContext.fields.pastIncidents.placeholder')}
        max={LIMITS.narrative}
      />
      <div className={ROW}>
        <TextAreaField
          name="risk.constraints"
          label={t('businessContext.fields.constraints.label')}
          placeholder={t('businessContext.fields.constraints.placeholder')}
          max={LIMITS.narrative}
        />
        <TextAreaField
          name="risk.notes"
          label={t('businessContext.fields.notes.label')}
          placeholder={t('businessContext.fields.notes.placeholder')}
          max={LIMITS.narrative}
        />
      </div>
    </>
  )
}
