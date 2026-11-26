import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCurrentUser } from '../auth/store'
import { homePath } from '../routes'
import { useDocumentTitle } from './useDocumentTitle'

type StatusPageProps = {
  code: number
  title: string
  message: string
}

export function StatusPage({ code, title, message }: StatusPageProps) {
  const { t } = useTranslation()
  const user = useCurrentUser()
  useDocumentTitle(title)

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-5 text-center md:px-10 md:py-8">
      <p className="font-title text-[4rem] leading-none text-teal">{code}</p>
      <h1 className="font-title text-[1.5rem] text-navy">{title}</h1>
      <p className="max-w-md font-body text-[0.9375rem] leading-[1.5] text-gray">{message}</p>
      <Link
        to={user ? homePath(user.role) : '/'}
        className="focus-ring inline-flex h-11 items-center rounded-md bg-navy px-5 font-body text-[0.875rem] font-semibold whitespace-nowrap text-white transition-[opacity,scale] duration-150 ease-[ease] hover:opacity-88 motion-safe:active:scale-[0.97]"
      >
        {t('status.backHome')}
      </Link>
    </main>
  )
}
