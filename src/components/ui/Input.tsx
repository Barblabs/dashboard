import { Input as BaseInput } from '@base-ui/react/input'
import { FIELD_SURFACE } from './fieldSurface'

type InputProps = Omit<BaseInput.Props, 'className'> & { className?: string }

export function Input({ className = '', ...props }: InputProps) {
  return (
    <BaseInput
      className={`${FIELD_SURFACE} px-3 py-2.5 text-[0.9375rem] not-data-invalid:focus:border-navy data-disabled:cursor-not-allowed data-disabled:bg-panel data-disabled:text-gray data-invalid:border-critical ${className}`}
      {...props}
    />
  )
}
