import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

type ProviderId = 'itop' | 'servicenow' | 'other'

interface Provider {
  id: ProviderId
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
}

export function CmdbSelector({ onSelect }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-border-panel bg-white p-6">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-title text-[20px] leading-[1.2] text-navy">
          {t('config.selector.title')}
        </h3>
        <p className="font-body text-[14px] leading-[1.4] text-gray">
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
              className={`flex size-11 shrink-0 items-center justify-center rounded-lg font-title text-[18px] ${
                p.available ? 'bg-navy text-cyan' : 'bg-muted-bg text-white'
              }`}
            >
              {p.initial}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
              <span
                className={`font-body text-[16px] font-semibold ${p.available ? 'text-navy' : 'text-gray'}`}
              >
                {t(`config.selector.providers.${p.id}.name`)}
              </span>
              <span className="font-body text-[14px] text-gray">
                {t(`config.selector.providers.${p.id}.description`)}
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
    </div>
  )
}
