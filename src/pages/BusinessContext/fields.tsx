import { useId, useMemo } from 'react'
import { useController } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useValidationText } from '../../i18n/validation'
import { Input } from '../../components/ui/Input'
import { MultiSelect, type Option } from '../../components/ui/MultiSelect'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Shell, Shown } from './FieldShell'
import { LIMITS, type BusinessContextFields } from '../../api/businessContext'
import { useMeta, type FieldPathOf } from './meta'
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
  const meta = useMeta(name)
  const errorText = useValidationText()
  const { field, fieldState } = useController<BusinessContextFields, TextProps['name']>({ name })
  const error = errorText(fieldState.error?.message, { max })
  const length = [...field.value].length
  return (
    <Shell
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
        <Textarea rows={rows} {...field} placeholder={placeholder} className={className} />
      ) : (
        <Input {...field} placeholder={placeholder} className={className} />
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
  const meta = useMeta(name)
  const { codes, labelOf } = useVocab(vocab)
  const errorText = useValidationText()
  const { field, fieldState } = useController<BusinessContextFields, OneOf['name']>({ name })
  const error = errorText(fieldState.error?.message)
  return (
    <Shell label={label} error={error} help={meta.readOnly ? undefined : hint} hideLabel={hideLabel} {...meta}>
      {meta.readOnly ? (
        <Shown value={field.value ? labelOf(field.value) : ''} />
      ) : (
        <Select
          {...field}
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
  const errorText = useValidationText()
  const { field, fieldState } = useController<BusinessContextFields, SomeOf['name']>({ name })
  const error = errorText(fieldState.error?.message, { max: LIMITS.entries })
  const options = useMemo<Option[]>(() => codes.map((code) => ({ value: code, label: labelOf(code) })), [codes, labelOf])
  return (
    // id is passed explicitly: Combobox.Input does not auto-register with the Field context.
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
