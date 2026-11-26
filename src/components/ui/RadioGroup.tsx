import { useId, type ReactNode } from 'react'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'

interface RadioOption<T extends string> {
  value: T
  label: ReactNode
  /** One line under the label, such as what choosing it leads to. */
  description?: ReactNode
}

interface Props<T extends string> {
  label: ReactNode
  value: T
  onValueChange: (value: T) => void
  options: readonly RadioOption<T>[]
  disabled?: boolean
}

/** One choice out of a few, each shown with its consequence: a card per option. */
export function RadioGroup<T extends string>({ label, value, onValueChange, options, disabled }: Props<T>) {
  const id = useId()
  const labelId = `${id}-label`
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="font-body text-[0.875rem] font-semibold text-navy">
        {label}
      </span>
      <BaseRadioGroup
        aria-labelledby={labelId}
        value={value}
        onValueChange={(next: T) => onValueChange(next)}
        disabled={disabled}
        className="flex flex-col gap-2"
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border-panel px-3 py-2.5 transition-[border-color,background-color] duration-150 ease-[ease] not-has-data-disabled:hover:border-navy/50 has-data-checked:border-navy has-data-checked:bg-navy/4 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60"
            >
              <Radio.Root
                value={option.value}
                aria-labelledby={`${optionId}-label`}
                aria-describedby={option.description ? `${optionId}-description` : undefined}
                className="focus-ring mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-gray bg-white data-checked:border-navy"
              >
                <Radio.Indicator className="size-2 rounded-full bg-navy" />
              </Radio.Root>
              <span className="flex flex-col gap-0.5">
                <span id={`${optionId}-label`} className="font-body text-[0.875rem] font-semibold text-navy">
                  {option.label}
                </span>
                {option.description && (
                  <span id={`${optionId}-description`} className="font-body text-[0.75rem] leading-[1.4] text-gray">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </BaseRadioGroup>
    </div>
  )
}
