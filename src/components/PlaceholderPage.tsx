import { useTranslation } from 'react-i18next'

type PlaceholderPageProps = {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <main className="flex flex-1 flex-col gap-3 px-10 py-8">
      <h1 className="font-title text-[28px] text-navy">{title}</h1>
      <p className="text-sm text-gray">{t('placeholder.comingSoon')}</p>
    </main>
  )
}
