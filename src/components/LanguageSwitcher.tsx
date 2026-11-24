import { useTranslation } from 'react-i18next'
import { chooseLanguage, LANGUAGES } from '../i18n'
import { useLocale } from '../i18n/format'

export function LanguageSwitcher() {
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
