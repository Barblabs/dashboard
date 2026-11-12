import { useId, useMemo } from 'react'
import { useController } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FIELD_SURFACE } from '../../components/ui/fieldSurface'
import { Input } from '../../components/ui/Input'
import { MultiSelect, type Option } from '../../components/ui/MultiSelect'
import { Select } from '../../components/ui/Select'
import { Shell, Shown } from './FieldShell'
import { LIMITS, type BusinessContextFields } from '../../api/businessContext'
import { useErrorText, useMeta, type FieldPathOf } from './meta'
import { useVocab, type Codes, type Vocab } from './vocab'

/*
 * Fields bind themselves by `name` so a section only says which field goes where; how a value,
 * its error and its suggested or read-only state reach the screen is decided once, here.
 */

interface TextProps {
  name: FieldPathOf<string>
  label: string
  placeholder?: string
  max: number
  hideLabel?: boolean
  /** Several lines of text in a textarea; without it, one line in an input. */
  rows?: number
  className?: string
}

export function TextField({ name, label, placeholder, max, hideLabel, rows, className = '' }: TextProps) {
  const id = useId()
  const meta = useMeta(name)
  const errorText = useErrorText()
  const { field, fieldState } = useController<BusinessContextFields, TextProps['name']>({ name })
  const error = errorText(fieldState.error?.message, max)
  const length = [...field.value].length
  const control = {
    id,
    ...field,
    placeholder,
    'aria-invalid': Boolean(fieldState.error) || length > max,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
  return (
    <Shell
      id={id}
      label={label}
      error={error}
      aside={
        length > max * 0.9 &&
        !meta.readOnly && (
          <span className={`font-mono text-[0.6875rem] ${length > max ? 'text-critical' : 'text-gray'}`}>
            {length} / {max}
          </span>
        )
      }
      hideLabel={hideLabel}
      {...meta}
    >
      {meta.readOnly ? (
        <Shown value={field.value} />
      ) : rows ? (
        <textarea
          rows={rows}
          {...control}
          className={`${FIELD_SURFACE} resize-y px-3 py-2.5 text-[0.9375rem] leading-[1.5] focus:border-navy aria-invalid:border-critical ${className}`}
        />
      ) : (
        <Input {...control} className={className} />
      )}
    </Shell>
  )
}

/*
 * Pairs a field with the vocabulary of its codes, so `tsc` refuses a field shown with another
 * field's options. A union rather than a generic, so the body sees the field's concrete values.
 */
type OneOf = { [V in Vocab]: { vocab: V; name: FieldPathOf<Codes[V] | ''> } }[Vocab]
type SomeOf = { [V in Vocab]: { vocab: V; name: FieldPathOf<Codes[V][]> } }[Vocab]

type SelectProps = OneOf & {
  label: string
  /** What the select shows while nothing is chosen. */
  emptyLabel?: string
  hint?: string
  hideLabel?: boolean
}

export function SelectField({ name, vocab, label, emptyLabel, hint, hideLabel }: SelectProps) {
  const { t } = useTranslation()
  const id = useId()
  const meta = useMeta(name)
  const { codes, labelOf } = useVocab(vocab)
  const errorText = useErrorText()
  const { field, fieldState } = useController<BusinessContextFields, OneOf['name']>({ name })
  const error = errorText(fieldState.error?.message)
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')
  return (
    <Shell id={id} label={label} error={error} hideLabel={hideLabel} {...meta}>
      {meta.readOnly ? (
        <Shown value={field.value ? labelOf(field.value) : ''} />
      ) : (
        <Select
          id={id}
          {...field}
          aria-invalid={Boolean(error)}
          aria-describedby={described || undefined}
          // As tall as the inputs it shares rows with; an unset value reads like a placeholder.
          className={`h-11 ${field.value === '' ? 'text-gray' : ''}`}
        >
          <option value="">{emptyLabel ?? t('businessContext.unset')}</option>
          {codes.map((code) => (
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

type MultiSelectProps = SomeOf & {
  label: string
  placeholder?: string
}

export function MultiSelectField({ name, vocab, label, placeholder }: MultiSelectProps) {
  const { t } = useTranslation()
  const id = useId()
  const meta = useMeta(name)
  const { codes, labelOf } = useVocab(vocab)
  const errorText = useErrorText()
  const { field, fieldState } = useController<BusinessContextFields, SomeOf['name']>({ name })
  const error = errorText(fieldState.error?.message, LIMITS.entries)
  const options = useMemo<Option[]>(() => codes.map((code) => ({ value: code, label: labelOf(code) })), [codes, labelOf])
  return (
    <Shell id={id} label={label} error={error} {...meta}>
      {meta.readOnly ? (
        <Shown value={field.value.map(labelOf).join(', ')} />
      ) : (
        <MultiSelect
          id={id}
          options={options}
          value={field.value}
          onChange={field.onChange}
          placeholder={placeholder ?? t('businessContext.choose')}
          emptyText={t('businessContext.noMatches')}
          removeLabel={(chosen) => t('businessContext.remove', { value: chosen })}
        />
      )}
    </Shell>
  )
}
