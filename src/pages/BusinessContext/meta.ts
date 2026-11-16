import { createContext, useContext } from 'react'
import type { Path, PathValue } from 'react-hook-form'
import type { BusinessContextFields } from '../../api/businessContext'

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
