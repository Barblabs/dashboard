import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function UsersPage() {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('users.title')} />
}
