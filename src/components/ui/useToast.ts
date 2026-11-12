import { useCallback } from 'react'
import { Toast } from '@base-ui/react/toast'
import type { ToastTone } from './Toast'

// A warning reports something that did not happen yet: it is announced urgently and stays longer.
const PRIORITY: Record<ToastTone, 'low' | 'high'> = { success: 'low', warning: 'high' }
const TIMEOUT: Record<ToastTone, number> = { success: 5000, warning: 10000 }

/** Shows a toast in the `ToastProvider` above. */
export function useToast() {
  const { add } = Toast.useToastManager()
  const show = useCallback(
    ({ tone, text }: { tone: ToastTone; text: string }) => {
      add({ type: tone, description: text, priority: PRIORITY[tone], timeout: TIMEOUT[tone] })
    },
    [add],
  )
  return { show }
}
