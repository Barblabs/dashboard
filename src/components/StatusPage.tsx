import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCurrentUser } from '../auth/store'
import { homePath } from '../routes'

type StatusPageProps = {
  code: number
  title: string
  message: string
}

export function StatusPage({ code, title, message }: StatusPageProps) {
  const { t } = useTranslation()
  const user = useCurrentUser()

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-5 text-center md:px-10 md:py-8">
      <p className="font-title text-[4rem] leading-none text-cyan">{code}</p>
      <h1 className="font-title text-[1.75rem] text-navy">{title}</h1>
      <p className="max-w-md text-sm text-gray">{message}</p>
      <Link
        to={user ? homePath(user.role) : '/'}
        className="focus-ring mt-3 rounded-md bg-navy px-5 py-2.5 font-body text-[0.875rem] font-semibold text-white transition-opacity duration-150 ease-[ease] hover:opacity-88"
      >
        {t('status.backHome')}
      </Link>
    </main>
  )
}
