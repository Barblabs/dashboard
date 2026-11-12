import { useCallback } from 'react'
import { Toast } from '@base-ui/react/toast'

// The tone reaches the toast as its `type`, which `Toast` styles through `data-type`.
export type ToastTone = 'success' | 'warning'

// A warning reports something that did not happen yet: it is announced urgently and stays longer.
const TONES: Record<ToastTone, { priority: 'low' | 'high'; timeout: number }> = {
  success: { priority: 'low', timeout: 5000 },
  warning: { priority: 'high', timeout: 10000 },
}

export function useToast() {
  const { add } = Toast.useToastManager()
  const show = useCallback(
    ({ tone, text }: { tone: ToastTone; text: string }) => {
      add({ type: tone, description: text, ...TONES[tone] })
    },
    [add],
  )
  return { show }
}
