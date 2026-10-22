import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function NotificationsPage() {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('notifications.title')} />
}
