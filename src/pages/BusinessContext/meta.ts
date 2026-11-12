import { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import type { BusinessContextFields } from '../../api/businessContext'
import type { ValidationKey } from './schema'

export type Fields = BusinessContextFields

export interface FormMeta {
  /** The fields a draft filled that are not saved yet. */
  filled: Set<string>
  readOnly: boolean
}

export const FormMetaContext = createContext<FormMeta>({ filled: new Set(), readOnly: true })

/** How a field shows: marked as suggested when a draft filled it, read-only for a Viewer. */
export function useMeta(name: string) {
  const { filled, readOnly } = useContext(FormMetaContext)
  return { suggested: filled.has(name), readOnly }
}

/** The schema's messages are translation keys; the field passes the limit that applies. */
export function useErrorText() {
  const { t } = useTranslation()
  return (message: string | undefined, max: number) => (message ? t(message as ValidationKey, { max }) : undefined)
}
