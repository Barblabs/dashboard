import { Component, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Message } from './Message'

class ErrorCatcher extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function ChartErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <ErrorCatcher
      fallback={
        <div className="rounded-xl border border-border-panel bg-white">
          <Message tone="error">{t('common.chartError')}</Message>
        </div>
      }
    >
      {children}
    </ErrorCatcher>
  )
}
