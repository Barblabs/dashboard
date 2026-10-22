import 'i18next'
import type { Translations } from './locales/en'

// Tipar los recursos hace que una clave inexistente sea error de compilación.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: Translations }
  }
}
