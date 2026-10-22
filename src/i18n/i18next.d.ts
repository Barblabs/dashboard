import 'i18next'
import type { Translations } from './locales/en'

// Typing the resources turns a missing key into a compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: Translations }
  }
}
