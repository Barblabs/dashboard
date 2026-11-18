import { useTranslation } from 'react-i18next'
import { canonicalDomain } from '../model'
import { TagField } from '../TagField'
import { ROW } from './layout'

export function Footprint() {
  const { t } = useTranslation()
  const domain = (entry: string) => {
    const value = canonicalDomain(entry)
    return value ? { value } : { error: t('businessContext.validation.domain', { value: entry }) }
  }
  return (
    <>
      <div className={ROW}>
        <TagField
          name="footprint.domains"
          label={t('businessContext.fields.domains.label')}
          placeholder={t('businessContext.fields.domains.placeholder')}
          canonical={domain}
        />
        <TagField
          name="footprint.brands"
          label={t('businessContext.fields.brands.label')}
          placeholder={t('businessContext.fields.brands.placeholder')}
        />
      </div>
      <div className={ROW}>
        <TagField
          name="footprint.technologies"
          label={t('businessContext.fields.technologies.label')}
          placeholder={t('businessContext.fields.technologies.placeholder')}
        />
        <TagField
          name="footprint.third_parties"
          label={t('businessContext.fields.thirdParties.label')}
          placeholder={t('businessContext.fields.thirdParties.placeholder')}
        />
      </div>
    </>
  )
}
