import { useTranslation } from 'react-i18next'
import type { CmdbProvider } from '../../api/cmdb'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Panel, PanelTitle } from '../../components/ui/Panel'

interface Provider {
  // "other" is a catalog entry for CMDBs without a dedicated integration, not a provider.
  id: CmdbProvider | 'other'
  initial: string
  available: boolean
}

const PROVIDERS: Provider[] = [
  { id: 'itop',       initial: 'I', available: true  },
  { id: 'servicenow', initial: 'S', available: false },
  { id: 'other',      initial: 'O', available: false },
]

interface Props {
  onSelect: () => void
  className?: string
}

export function CmdbSelector({ onSelect, className = '' }: Props) {
  const { t } = useTranslation()

  return (
    <Panel className={`gap-4 ${className}`}>
      <div className="flex flex-col gap-0.5">
        <PanelTitle>{t('config.selector.title')}</PanelTitle>
        <p className="font-body text-[0.875rem] leading-[1.4] text-gray">
          {t('config.selector.subtitle')}
        </p>
      </div>

      <div>
        {PROVIDERS.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3.5 rounded-[10px] p-4 ${
              p.available ? 'border-2 border-navy bg-white' : 'border border-border-panel bg-panel'
            }`}
          >
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-lg font-title text-[1.125rem] ${
                p.available ? 'bg-navy text-cyan' : 'bg-muted-bg text-white'
              }`}
            >
              {p.initial}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
              <span
                className={`font-body text-[1rem] font-semibold ${p.available ? 'text-navy' : 'text-gray'}`}
              >
                {t(`config.providers.${p.id}.name`)}
              </span>
              <span className="font-body text-[0.875rem] text-gray">
                {t(`config.providers.${p.id}.description`)}
              </span>
            </div>
            {p.available ? (
              <Button size="lg" className="shrink-0" onClick={onSelect}>
                {t('config.selector.select')}
              </Button>
            ) : (
              <Badge variant="caps">{t('config.selector.comingSoon')}</Badge>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}
