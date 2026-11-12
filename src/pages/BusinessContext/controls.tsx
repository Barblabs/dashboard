import { useId, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MultiSelect, type Option } from '../../components/ui/MultiSelect'
import { Select } from '../../components/ui/Select'
import { CloseIcon } from '../../components/ui/icons'
import { FIELD_SURFACE } from '../../components/ui/fieldSurface'
import { LIMITS } from '../../api/businessContext'
import { EMPTY, useLocale } from '../../i18n/format'
import { COUNTRIES, countryNamer } from './model'

export interface FieldMeta {
  /** Filled from a document and not saved yet. */
  suggested?: boolean
  readOnly?: boolean
  /** The label is only for screen readers, where the placeholder says enough. */
  hideLabel?: boolean
}

interface ShellProps extends FieldMeta {
  id: string
  label: string
  error?: string
  /** Shown at the label's right, such as a character count near the limit. */
  aside?: ReactNode
  children: ReactNode
}

function Shell({ id, label, error, aside, suggested, readOnly, hideLabel, children }: ShellProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${suggested ? '-ml-3 border-l-2 border-cyan pl-[10px]' : ''}`}>
      <div className={hideLabel ? 'sr-only' : 'flex items-baseline justify-between gap-3'}>
        {readOnly ? (
          <span className="font-body text-[0.8125rem] font-semibold text-gray">{label}</span>
        ) : (
          <label htmlFor={id} className="font-body text-[0.875rem] font-semibold text-navy">
            {label}
          </label>
        )}
        {aside}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="font-body text-[0.75rem] text-critical">
          {error}
        </p>
      )}
    </div>
  )
}

function Shown({ value }: { value: string }) {
  return value.trim() ? (
    <p className="whitespace-pre-wrap font-body text-[0.9375rem] leading-[1.5] text-navy">{value}</p>
  ) : (
    <p className="font-body text-[0.9375rem] text-muted-bg">{EMPTY}</p>
  )
}

interface TextProps extends FieldMeta {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  max: number
  rows?: number
  error?: string
}

export function TextAreaField({ label, placeholder, value, onChange, max, rows = 3, error, ...meta }: TextProps) {
  const id = useId()
  const length = [...value].length
  const near = length > max * 0.9
  return (
    <Shell
      id={id}
      label={label}
      error={error}
      aside={
        near && !meta.readOnly ? (
          <span className={`font-mono text-[0.6875rem] ${length > max ? 'text-critical' : 'text-gray'}`}>
            {length} / {max}
          </span>
        ) : null
      }
      {...meta}
    >
      {meta.readOnly ? (
        <Shown value={value} />
      ) : (
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error) || length > max}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD_SURFACE} resize-y px-3 py-2.5 text-[0.9375rem] leading-[1.5] focus:border-navy aria-invalid:border-critical`}
        />
      )}
    </Shell>
  )
}

interface SelectProps<T extends string> extends FieldMeta {
  label: string
  options: readonly T[]
  labelOf: (code: T) => string
  value: T | ''
  onChange: (value: T | '') => void
  /** What the select shows while nothing is chosen. */
  emptyLabel?: string
  hint?: string
}

export function SelectField<T extends string>({
  label,
  options,
  labelOf,
  value,
  onChange,
  emptyLabel,
  hint,
  ...meta
}: SelectProps<T>) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <Shell id={id} label={label} {...meta}>
      {meta.readOnly ? (
        <Shown value={value ? labelOf(value as T) : ''} />
      ) : (
        <Select
          id={id}
          value={value}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value as T | '')}
          // As tall as the inputs it shares rows with; an unset value reads like a placeholder.
          className={`h-11 ${value === '' ? 'text-gray' : ''}`}
        >
          <option value="">{emptyLabel ?? t('businessContext.unset')}</option>
          {options.map((code) => (
            <option key={code} value={code}>
              {labelOf(code)}
            </option>
          ))}
        </Select>
      )}
      {hint && !meta.readOnly && (
        <p id={`${id}-hint`} className="font-body text-[0.75rem] text-gray">
          {hint}
        </p>
      )}
    </Shell>
  )
}

interface MultiProps<T extends string> extends FieldMeta {
  label: string
  placeholder?: string
  options: readonly T[]
  labelOf: (code: T) => string
  value: T[]
  onChange: (value: T[]) => void
}

export function MultiSelectField<T extends string>({
  label,
  placeholder,
  options,
  labelOf,
  value,
  onChange,
  ...meta
}: MultiProps<T>) {
  const { t } = useTranslation()
  const id = useId()
  const items = useMemo<Option[]>(() => options.map((code) => ({ value: code, label: labelOf(code) })), [options, labelOf])
  return (
    <Shell id={id} label={label} {...meta}>
      {meta.readOnly ? (
        <Shown value={value.map(labelOf).join(', ')} />
      ) : (
        <MultiSelect
          id={id}
          options={items}
          value={value}
          onChange={(next) => onChange(next as T[])}
          placeholder={placeholder ?? t('businessContext.choose')}
          emptyText={t('businessContext.noMatches')}
          removeLabel={(name) => t('businessContext.remove', { value: name })}
        />
      )}
    </Shell>
  )
}

function useCountries() {
  const language = useLocale()
  return useMemo(() => {
    const name = countryNamer(language)
    const codes = COUNTRIES.toSorted((a, b) => name(a).localeCompare(name(b), language))
    return { name, codes }
  }, [language])
}

export function CountryField({
  label,
  value,
  onChange,
  ...meta
}: FieldMeta & { label: string; value: string; onChange: (v: string) => void }) {
  const { name, codes } = useCountries()
  return <SelectField label={label} options={codes} labelOf={name} value={value} onChange={onChange} {...meta} />
}

export function CountriesField({
  label,
  placeholder,
  value,
  onChange,
  ...meta
}: FieldMeta & { label: string; placeholder: string; value: string[]; onChange: (v: string[]) => void }) {
  const { name, codes } = useCountries()
  return (
    <MultiSelectField
      label={label}
      placeholder={placeholder}
      options={codes}
      labelOf={name}
      value={value}
      onChange={onChange}
      {...meta}
    />
  )
}

interface TagProps extends FieldMeta {
  label: string
  placeholder?: string
  value: string[]
  onChange: (value: string[]) => void
  suggestions?: string[]
  /** The entry as it is kept, or the message for one that is not valid. */
  canonical?: (entry: string) => { value: string } | { error: string }
}

/** Free-text entries: Enter, a comma or a pasted list adds them; repeats are ignored regardless of case. */
export function TagField({ label, placeholder, value, onChange, suggestions, canonical, ...meta }: TagProps) {
  const { t } = useTranslation()
  const id = useId()
  const listId = useId()
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
    <Shell id={id} label={label} error={error ?? undefined} {...meta}>
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
