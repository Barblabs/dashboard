import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function FindingsPage() {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('findings.title')} />
}
