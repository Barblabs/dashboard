import { useTranslation } from 'react-i18next'
import { Page } from './Page'

export function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation()
  return <Page title={title} subtitle={t('placeholder.comingSoon')} />
}
