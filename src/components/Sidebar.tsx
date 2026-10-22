import { useTranslation } from 'react-i18next'
import { chooseLanguage, LANGUAGES } from '../i18n'

type NavItem = {
  id: 'findings' | 'config' | 'notifications'
  active: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'findings',      active: false },
  { id: 'config',        active: true  },
  { id: 'notifications', active: false },
]

export function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="flex min-h-screen w-[232px] shrink-0 flex-col justify-between bg-navy px-5 py-7">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <img src="/castle-logo.svg" alt="" className="size-10 shrink-0" aria-hidden="true" />
          <span className="font-title text-[19px] leading-[1.2] whitespace-nowrap">
            <span className="text-white">BARB</span>
            <span className="text-cyan">ATTACK</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 font-body text-[15px] transition-[background,color] duration-150 ease-[ease] hover:bg-white/6 hover:text-white ${
                item.active ? 'bg-nav-active-bg font-semibold text-white' : 'font-medium text-nav-text'
              }`}
            >
              <span
                className={`h-5 w-1 shrink-0 rounded-xs ${item.active ? 'bg-cyan' : 'bg-transparent'}`}
              />
              {t(`sidebar.nav.${item.id}`)}
            </div>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-3">
        <LanguageSwitcher />
        <p className="font-body text-[13px] leading-[1.4] text-nav-text-dim">
          {t('sidebar.footer.course')}<br />
          {t('sidebar.footer.stage')}
        </p>
      </div>
    </aside>
  )
}

function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <div role="group" aria-label={t('sidebar.language.label')} className="flex gap-1">
      {LANGUAGES.map((language) => {
        const active = i18n.resolvedLanguage === language
        return (
          <button
            key={language}
            type="button"
            aria-pressed={active}
            onClick={() => chooseLanguage(language)}
            className={`cursor-pointer rounded-md px-2 py-1 font-body text-[13px] font-semibold transition-[background,color] duration-150 ease-[ease] hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan ${
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
