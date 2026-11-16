import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

/*
 * Form schemas give translation keys as their messages, so a field's error is resolved at
 * render time, in the active language. This is the one place a message is read back as a key.
 */
export function useValidationText() {
  const { t } = useTranslation()
  return (message: string | undefined, values?: { max?: number }) =>
    message ? t(message as ParseKeys, values) : undefined
}
