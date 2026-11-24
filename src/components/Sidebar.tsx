import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router'
import { signOut } from '../auth/signOut'
import { useCurrentUser } from '../auth/store'
import { chooseLanguage, LANGUAGES } from '../i18n'
import { useLocale } from '../i18n/format'
import { pagePath, pagesFor } from '../routes'
import { MenuIcon } from './ui/icons'
import { Sheet } from './ui/Sheet'
import { Wordmark } from './Wordmark'

export function Sidebar() {
  const { t } = useTranslation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <aside className="hidden min-h-dvh w-[232px] shrink-0 md:flex">
        <SidebarContent />
      </aside>
      <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-3 bg-navy px-3 pt-[env(safe-area-inset-top)] md:hidden">
        <button
          type="button"
          aria-label={t('sidebar.menu')}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="cursor-pointer rounded-md p-2 text-white transition-colors duration-150 ease-[ease] hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-cyan"
        >
          <MenuIcon />
        </button>
        <img src="/castle-logo.svg" alt="" className="size-8 shrink-0" aria-hidden="true" />
        <Wordmark />
      </header>
      <Sheet open={drawerOpen} onClose={() => setDrawerOpen(false)} side="left">
        <SidebarContent onNavigate={() => setDrawerOpen(false)} />
      </Sheet>
    </>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const pages = user ? pagesFor(user.role) : []

  function handleSignOut() {
    signOut()
    void navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-1 flex-col justify-between gap-8 overflow-y-auto bg-navy px-5 py-7">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <img src="/castle-logo.svg" alt="" className="size-10 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <Wordmark />
            {user?.role === 'platform_admin' && (
              <span className="font-body text-[0.75rem] font-semibold uppercase tracking-wider text-nav-text-dim">
                {t('sidebar.superAdmin')}
              </span>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {pages.map(({ id }) => (
            <NavLink
              key={id}
              to={pagePath(id)}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-md px-3 font-body text-[0.9375rem] transition-[background,color] duration-150 ease-[ease] hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan ${
                  isActive ? 'bg-nav-active-bg font-semibold text-white' : 'font-medium text-nav-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`h-5 w-1 shrink-0 rounded-xs ${isActive ? 'bg-cyan' : 'bg-transparent'}`}
                  />
                  {t(`sidebar.nav.${id}`)}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <LanguageSwitcher />
        {user && (
          <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate font-body text-[0.8125rem] leading-[1.4] text-nav-text">
                {user.email}
              </p>
              <p className="font-body text-[0.8125rem] leading-[1.4] text-nav-text-dim">
                {t(`sidebar.user.role.${user.role}`)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="cursor-pointer rounded-md border border-white/15 px-3 py-1.5 font-body text-[0.8125rem] font-semibold text-nav-text transition-[background,color] duration-150 ease-[ease] hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan"
            >
              {t('sidebar.signOut')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LanguageSwitcher() {
  const { t } = useTranslation()
  const locale = useLocale()

  return (
    <div role="group" aria-label={t('sidebar.language.label')} className="flex gap-1">
      {LANGUAGES.map((language) => {
        const active = locale === language
        return (
          <button
            key={language}
            type="button"
            aria-pressed={active}
            onClick={() => chooseLanguage(language)}
            className={`cursor-pointer rounded-md px-2 py-1 font-body text-[0.8125rem] font-semibold transition-[background,color] duration-150 ease-[ease] hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan ${
              active ? 'bg-nav-active-bg text-white' : 'text-nav-text-dim'
            }`}
          >
            {language.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
