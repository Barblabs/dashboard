import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function AdminDashboardPage() {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('adminDashboard.title')} />
}
