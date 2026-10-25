import { Input as BaseInput } from '@base-ui/react/input'

type InputProps = Omit<BaseInput.Props, 'className'> & { className?: string }

export function Input({ className = '', ...props }: InputProps) {
  return (
    <BaseInput
      className={`w-full rounded-md border border-border-panel bg-white px-3 py-2.5 font-body text-[0.9375rem] text-navy outline-none transition-[border-color] duration-150 ease-[ease] focus-ring not-data-invalid:focus:border-navy data-disabled:cursor-not-allowed data-disabled:bg-panel data-disabled:text-gray data-invalid:border-critical ${className}`}
      {...props}
    />
  )
}
