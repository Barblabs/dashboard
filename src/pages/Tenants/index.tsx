import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function TenantsPage() {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('tenants.title')} />
}
