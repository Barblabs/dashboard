import type { ReactNode } from 'react'
import { Toast } from '@base-ui/react/toast'
import { useTranslation } from 'react-i18next'
import { CloseIcon } from './icons'

export type ToastTone = 'success' | 'warning'

const TONES: Record<ToastTone, string> = {
  success: 'border-l-nav-active-bg',
  warning: 'border-l-high',
}

// Opacity always animates; the slide only when the user allows motion.
const ROOT =
  'pointer-events-auto flex items-start gap-3 rounded-md border border-l-4 border-border-panel bg-white px-4 py-3 shadow-lg transition-[opacity,translate] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:data-ending-style:translate-y-2 motion-safe:data-starting-style:translate-y-2'

function isTone(type: string | undefined): type is ToastTone {
  return type === 'success' || type === 'warning'
}

function ToastList() {
  const { t } = useTranslation()
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={`${ROOT} ${isTone(toast.type) ? TONES[toast.type] : ''}`}
    >
      <Toast.Description className="min-w-0 flex-1 font-body text-[0.875rem] leading-[1.4] break-words text-navy" />
      <Toast.Close
        aria-label={t('common.close')}
        className="shrink-0 rounded-sm p-1 text-gray transition-colors hover:text-navy focus-ring"
      >
        <CloseIcon />
      </Toast.Close>
    </Toast.Root>
  ))
}

/** Mounted once at the root of the app: every `useToast` below it shows its toasts here. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport
          aria-label={t('common.toastRegion')}
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        >
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}
