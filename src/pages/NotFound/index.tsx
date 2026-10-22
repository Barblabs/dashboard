import { useTranslation } from 'react-i18next'
import { StatusPage } from '../../components/StatusPage'

export function NotFoundPage() {
  const { t } = useTranslation()
  return <StatusPage code={404} title={t('status.notFound.title')} message={t('status.notFound.message')} />
}
