import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCurrentUser } from '../../auth/store'
import { homePath } from '../../routes'

const SIZES = {
  md: 'h-10 px-4 text-[0.875rem]',
  lg: 'h-12 px-6 text-[0.9375rem]',
}

export function PrimaryAction({ size = 'md' }: { size?: keyof typeof SIZES }) {
  const { t } = useTranslation()
  const user = useCurrentUser()

  return (
    <Link
      to={user ? homePath(user.role) : '/login'}
      className={`inline-flex items-center justify-center rounded-md bg-cyan font-body font-semibold whitespace-nowrap text-navy transition-[background-color,scale] duration-150 ease-[ease] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan motion-safe:active:scale-[0.97] ${SIZES[size]}`}
    >
      {user ? t('landing.action.open') : t('landing.action.signIn')}
    </Link>
  )
}
