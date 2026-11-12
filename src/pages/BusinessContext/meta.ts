import { createContext, useContext } from 'react'
import type { Path, PathValue } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { BusinessContextFields } from '../../api/businessContext'
import type { ValidationKey } from './schema'

/*
 * The fields whose value is exactly `V`. react-hook-form's `FieldPathByValue` only checks
 * assignability, which lets a free-text field bind to a field of codes.
 */
export type FieldPathOf<V> = {
  [K in Path<BusinessContextFields>]: [PathValue<BusinessContextFields, K>] extends [V]
    ? [V] extends [PathValue<BusinessContextFields, K>]
      ? K
      : never
    : never
}[Path<BusinessContextFields>]

export interface FormMeta {
  /** The `FieldPath`s a draft filled that are not saved yet; read as strings so any field can ask. */
  filled: ReadonlySet<string>
  readOnly: boolean
}

export const FormMetaContext = createContext<FormMeta>({ filled: new Set(), readOnly: true })

/** How a field shows: marked as suggested when a draft filled it, read-only for a Viewer. */
export function useMeta(name: Path<BusinessContextFields>) {
  const { filled, readOnly } = useContext(FormMetaContext)
  return { suggested: filled.has(name), readOnly }
}

/** The schema's messages are translation keys; the field passes the limit that applies. */
export function useErrorText() {
  const { t } = useTranslation()
  return (message: string | undefined, max: number) => (message ? t(message as ValidationKey, { max }) : undefined)
}
