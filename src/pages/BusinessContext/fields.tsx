import { useId, useMemo } from 'react'
import { useController } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FIELD_SURFACE } from '../../components/ui/fieldSurface'
import { Input } from '../../components/ui/Input'
import { MultiSelect, type Option } from '../../components/ui/MultiSelect'
import { Select } from '../../components/ui/Select'
import { Shell, Shown } from './FieldShell'
import { useErrorText, useMeta, type FieldPathOf, type Fields } from './meta'
import { useVocab, type Codes, type Vocab } from './vocab'

/*
 * Each field binds itself to the form by `name`: it reads and writes the value, shows the
 * schema's error, and takes whether it is suggested or read-only from the form's meta.
 */

interface TextProps {
  name: FieldPathOf<string>
  label: string
  placeholder?: string
  max: number
  hideLabel?: boolean
}

function useTextField(name: TextProps['name'], max: number) {
  const { field, fieldState } = useController<Fields, TextProps['name']>({ name })
  const errorText = useErrorText()
  const meta = useMeta(name)
  const length = [...field.value].length
  const near = length > max * 0.9 && !meta.readOnly
  return {
    id: useId(),
    field,
    meta,
    error: errorText(fieldState.error?.message, max),
    invalid: Boolean(fieldState.error) || length > max,
    counter: near ? (
      <span className={`font-mono text-[0.6875rem] ${length > max ? 'text-critical' : 'text-gray'}`}>
        {length} / {max}
      </span>
    ) : null,
  }
}

export function TextAreaField({ name, label, placeholder, max, hideLabel, rows = 3 }: TextProps & { rows?: number }) {
  const { id, field, meta, error, invalid, counter } = useTextField(name, max)
  return (
    <Shell
      id={id}
      label={label}
      error={error}
      aside={counter}
      hideLabel={hideLabel}
      {...meta}
    >
      {meta.readOnly ? (
        <Shown value={field.value} />
      ) : (
        <textarea
          id={id}
          rows={rows}
          {...field}
          placeholder={placeholder}
          aria-invalid={invalid}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${FIELD_SURFACE} resize-y px-3 py-2.5 text-[0.9375rem] leading-[1.5] focus:border-navy aria-invalid:border-critical`}
        />
      )}
    </Shell>
  )
}

export function TextField({ name, label, placeholder, max, hideLabel, className }: TextProps & { className?: string }) {
  const { id, field, meta, error, invalid, counter } = useTextField(name, max)
  return (
    <Shell
      id={id}
      label={label}
      error={error}
      aside={counter}
      hideLabel={hideLabel}
      {...meta}
    >
      {meta.readOnly ? (
        <Shown value={field.value} />
      ) : (
        <Input
          id={id}
          {...field}
          placeholder={placeholder}
          aria-invalid={invalid}
          aria-describedby={error ? `${id}-error` : undefined}
          className={className}
        />
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
  const { field } = useController<Fields, OneOf['name']>({ name })
  return (
    <Shell id={id} label={label} hideLabel={hideLabel} {...meta}>
      {meta.readOnly ? (
        <Shown value={field.value ? labelOf(field.value) : ''} />
      ) : (
        <Select
          id={id}
          {...field}
          aria-describedby={hint ? `${id}-hint` : undefined}
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
  const { field } = useController<Fields, SomeOf['name']>({ name })
  const options = useMemo<Option[]>(() => codes.map((code) => ({ value: code, label: labelOf(code) })), [codes, labelOf])
  return (
    <Shell id={id} label={label} {...meta}>
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
