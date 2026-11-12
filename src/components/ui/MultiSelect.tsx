import { useMemo } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { CheckIcon, CloseIcon } from './icons'

export interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  id?: string
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  /** Shown when the typed filter matches nothing. */
  emptyText: string
  removeLabel: (label: string) => string
}

/** Picks several options from a searchable list; the chosen ones show as removable chips. */
export function MultiSelect({ id, options, value, onChange, placeholder, emptyText, removeLabel }: MultiSelectProps) {
  const items = useMemo(
    () => Combobox.createItems(options, { getValue: (o) => o.value, getLabel: (o) => o.label }),
    [options],
  )
  const labels = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options])

  return (
    <Combobox.Root
      items={items}
      multiple
      value={value}
      onValueChange={(next) => onChange(next)}
      // Several options are often picked in a row, so choosing one keeps the list open.
      onOpenChange={(open, details) => {
        if (!open && details.reason === 'item-press') details.cancel()
      }}
    >
      <Combobox.InputGroup className="flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-border-panel bg-white px-2 py-1.5 transition-[border-color] duration-150 ease-[ease] focus-within:border-navy">
        <Combobox.Chips className="flex w-full flex-wrap items-center gap-1.5">
          {value.map((v) => (
            <Combobox.Chip
              key={v}
              className="flex items-center gap-1 rounded-sm bg-panel py-0.5 pr-1 pl-2 font-body text-[0.8125rem] text-navy outline-none focus-within:bg-navy focus-within:text-white"
            >
              {labels.get(v) ?? v}
              <Combobox.ChipRemove
                aria-label={removeLabel(labels.get(v) ?? v)}
                className="flex size-4 cursor-pointer items-center justify-center rounded-xs text-gray hover:bg-border-panel hover:text-navy"
              >
                <CloseIcon />
              </Combobox.ChipRemove>
            </Combobox.Chip>
          ))}
          <Combobox.Input
            id={id}
            placeholder={value.length > 0 ? '' : placeholder}
            className="h-7 min-w-24 flex-1 bg-transparent px-1 font-body text-[0.9375rem] text-navy outline-none placeholder:text-gray"
          />
        </Combobox.Chips>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={6}>
          <Combobox.Popup className="max-h-[min(var(--available-height),18rem)] w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-lg border border-border-panel bg-white py-1 shadow-lg transition-[scale,opacity] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <Combobox.Empty>
              <p className="px-3 py-2 font-body text-[0.875rem] text-gray">{emptyText}</p>
            </Combobox.Empty>
            <Combobox.List>
              {(option: Option) => (
                <Combobox.Item
                  key={option.value}
                  value={option.value}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 px-3 py-2 font-body text-[0.875rem] text-navy outline-none select-none data-highlighted:bg-panel"
                >
                  <Combobox.ItemIndicator className="col-start-1 text-navy">
                    <CheckIcon />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2">{option.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
