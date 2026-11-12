import { useTranslation } from 'react-i18next'
import { LIMITS } from '../../../api/businessContext'
import { MultiSelectField, SelectField, TextAreaField } from '../fields'
import { ROW } from './layout'

export function Profile() {
  const { t } = useTranslation()
  return (
    <>
      <TextAreaField
        name="profile.summary"
        label={t('businessContext.fields.summary.label')}
        placeholder={t('businessContext.fields.summary.placeholder')}
        max={LIMITS.summary}
        rows={4}
      />
      <MultiSelectField name="profile.sectors" vocab="sectors" label={t('businessContext.fields.sectors')} />
      <div className="grid gap-5 md:grid-cols-3">
        <SelectField
          name="profile.organization_type"
          vocab="organizationTypes"
          label={t('businessContext.fields.organizationType')}
        />
        <SelectField name="profile.employees" vocab="employees" label={t('businessContext.fields.employees')} />
        <SelectField name="profile.annual_revenue" vocab="revenue" label={t('businessContext.fields.annualRevenue')} />
      </div>
      <div className={ROW}>
        <TextAreaField name="profile.mission" label={t('businessContext.fields.mission')} max={LIMITS.statement} />
        <TextAreaField name="profile.vision" label={t('businessContext.fields.vision')} max={LIMITS.statement} />
      </div>
    </>
  )
}
