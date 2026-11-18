import type { i18n as I18n, ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

// Zod types a message as any string; the schemas here give translation keys.
function isTranslationKey(i18n: I18n, message: string): message is ParseKeys {
  return i18n.exists(message)
}

/*
 * Form schemas give translation keys as their messages, so a field's error is resolved at
 * render time, in the active language. This is the one place a message is read back as a key.
 * A message that is not a key, such as one of zod's own, shows as it is.
 */
export function useValidationText() {
  const { t, i18n } = useTranslation()
  return (message: string | undefined, values?: { max?: number }) => {
    if (!message) return undefined
    return isTranslationKey(i18n, message) ? t(message, values) : message
  }
}
