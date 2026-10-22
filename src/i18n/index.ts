import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { es } from './locales/es'

export const LANGUAGES = ['en', 'es'] as const
export type Language = (typeof LANGUAGES)[number]

const STORAGE_KEY = 'language'

function toSupportedLanguage(code: string): Language {
  const normalized = code.toLowerCase()
  return normalized === 'es' || normalized.startsWith('es-') ? 'es' : 'en'
}

// Only a manual choice is stored: the detected browser language is not persisted, so a
// browser language change is respected until the user picks one.
export function chooseLanguage(language: Language) {
  localStorage.setItem(STORAGE_KEY, language)
  return i18n.changeLanguage(language)
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es } },
    supportedLngs: LANGUAGES,
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: [],
      convertDetectedLanguage: toSupportedLanguage,
    },
    interpolation: { escapeValue: false },
  })

export { i18n }
