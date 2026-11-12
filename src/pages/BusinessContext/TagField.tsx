import { useId, useState } from 'react'
import { useController } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { LIMITS } from '../../api/businessContext'
import { CloseIcon } from '../../components/ui/icons'
import { Shell, Shown } from './FieldShell'
import { useMeta, type FieldPathOf, type Fields } from './meta'

interface TagProps {
  name: FieldPathOf<string[]>
  label: string
  placeholder?: string
  hideLabel?: boolean
  suggestions?: string[]
  /** The entry as it is kept, or the message for one that is not valid. */
  canonical?: (entry: string) => { value: string } | { error: string }
}

/** Free-text entries: Enter, a comma or a pasted list adds them; repeats are ignored regardless of case. */
export function TagField({ name, label, placeholder, hideLabel, suggestions, canonical }: TagProps) {
  const { t } = useTranslation()
  const id = useId()
  const listId = useId()
  const meta = useMeta(name)
  const {
    field: { value, onChange },
  } = useController<Fields, TagProps['name']>({ name })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  function add(raw: string) {
    const next = [...value]
    for (const entry of raw.split(/[,\n]/).map((e) => e.trim()).filter(Boolean)) {
      const result = canonical ? canonical(entry) : { value: entry }
      if ('error' in result) return setError(result.error)
      if ([...result.value].length > LIMITS.entry) {
        return setError(t('businessContext.validation.tooLong', { max: LIMITS.entry }))
      }
      if (!next.some((v) => v.toLowerCase() === result.value.toLowerCase())) next.push(result.value)
    }
    if (next.length > LIMITS.entries) return setError(t('businessContext.validation.tooMany', { max: LIMITS.entries }))
    setError(null)
    setDraft('')
    onChange(next)
  }

  return (
    <Shell id={id} label={label} error={error ?? undefined} hideLabel={hideLabel} {...meta}>
      {meta.readOnly ? (
        <Shown value={value.join(', ')} />
      ) : (
        <div
          className={`flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 transition-[border-color] duration-150 focus-within:border-navy ${
            error ? 'border-critical' : 'border-border-panel'
          }`}
        >
          {value.map((entry) => (
            <span
              key={entry}
              className="flex items-center gap-1 rounded-sm bg-panel py-0.5 pr-1 pl-2 font-body text-[0.8125rem] text-navy"
            >
              {entry}
              <button
                type="button"
                aria-label={t('businessContext.remove', { value: entry })}
                onClick={() => onChange(value.filter((v) => v !== entry))}
                className="flex size-4 cursor-pointer items-center justify-center rounded-xs text-gray hover:bg-border-panel hover:text-navy focus-ring"
              >
                <CloseIcon />
              </button>
            </span>
          ))}
          <input
            id={id}
            value={draft}
            list={suggestions?.length ? listId : undefined}
            placeholder={value.length === 0 ? placeholder : undefined}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setError(null)
              setDraft(e.target.value)
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
                e.preventDefault()
                add(draft)
              } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
                onChange(value.slice(0, -1))
              }
            }}
            onBlur={() => draft.trim() && add(draft)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text')
              if (/[,\n]/.test(text)) {
                e.preventDefault()
                add(text)
              }
            }}
            className="h-7 min-w-24 flex-1 bg-transparent px-1 font-body text-[0.9375rem] text-navy outline-none placeholder:text-gray"
          />
          {suggestions && suggestions.length > 0 && (
            <datalist id={listId}>
              {suggestions
                .filter((s) => !value.includes(s))
                .map((s) => (
                  <option key={s} value={s} />
                ))}
            </datalist>
          )}
        </div>
      )}
    </Shell>
  )
}
