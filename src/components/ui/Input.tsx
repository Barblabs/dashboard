import { Input as BaseInput } from '@base-ui/react/input'

type InputProps = Omit<BaseInput.Props, 'className'> & { className?: string }

export function Input({ className = '', ...props }: InputProps) {
  return (
    <BaseInput
      className={`w-full rounded-md border border-border-panel bg-white px-3 py-2.5 font-body text-[15px] text-navy outline-none transition-[border-color] duration-150 ease-[ease] not-data-invalid:focus:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy data-disabled:cursor-not-allowed data-disabled:bg-panel data-disabled:text-gray data-invalid:border-critical ${className}`}
      {...props}
    />
  )
}
