import { useState } from 'react'
import { Toggle } from '@base-ui/react/toggle'
import { useTranslation } from 'react-i18next'
import { EyeIcon, EyeOffIcon } from './icons'
import { Input } from './Input'
import type { Input as BaseInput } from '@base-ui/react/input'

type InputProps = Omit<BaseInput.Props, 'className' | 'type'> & { className?: string }

/** A password field with an inline toggle that reveals or hides what was typed. */
export function PasswordInput({ className = '', ...props }: InputProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={`pr-10 ${className}`}
        {...props}
      />
      <Toggle
        type="button"
        pressed={visible}
        onPressedChange={setVisible}
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-1 text-gray hover:text-navy focus-ring"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </Toggle>
    </div>
  )
}
