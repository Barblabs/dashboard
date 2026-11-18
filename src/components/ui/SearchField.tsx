import { SearchIcon } from './icons'
import { Input } from './Input'

interface Props {
  /** Names the field and shows as its placeholder. */
  label: string
  value: string
  onChange: (value: string) => void
  /** A summary beside the field, such as how many items there are. */
  counter?: string
}

export function SearchField({ label, value, onChange, counter }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray" />
        <Input
          type="search"
          aria-label={label}
          placeholder={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
      {counter && <p className="shrink-0 font-body text-[0.875rem] text-gray">{counter}</p>}
    </div>
  )
}
