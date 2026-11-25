import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCriticalServicesQuery, type CriticalServiceHealth } from '../../api/businessContext'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useLocale } from '../../i18n/format'

const TEXT_LINK = 'focus-ring rounded-sm font-body font-semibold text-nav-active-bg hover:underline'

const ROWS = 5

const PILLS: Record<CriticalServiceHealth['status'], BadgeVariant> = {
  at_risk: 'critical',
  watch: 'warning',
  clear: 'good',
}

export function CriticalServices() {
  const { t } = useTranslation()
  const titleId = useId()
  const query = useCriticalServicesQuery()
  return (
    <Card aria-labelledby={titleId}>
      <div className="flex flex-col gap-1 border-b border-border-panel px-6 py-4">
        <h2 id={titleId} className="font-title text-[1rem] text-navy">{t('dashboard.services.title')}</h2>
        <p className="font-body text-[0.8125rem] text-gray">{t('dashboard.services.rule')}</p>
      </div>
      <QueryBoundary
        query={query}
        keys={{ loading: 'dashboard.loading', failed: 'dashboard.failed', network: 'dashboard.network' }}
      >
        {(services) => <ServiceList services={services} />}
      </QueryBoundary>
    </Card>
  )
}

function ServiceList({ services }: { services: CriticalServiceHealth[] }) {
  const { t } = useTranslation()
  const listId = useId()
  const [expanded, setExpanded] = useState(false)

  if (services.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <Link to="/business-context" className={`${TEXT_LINK} text-[0.875rem]`}>
          {t('dashboard.services.empty')}
        </Link>
      </div>
    )
  }

  const shown = expanded ? services : services.slice(0, ROWS)

  return (
    <>
      <ul id={listId} className="flex flex-col gap-3 p-6">
        {shown.map((service, i) => (
          <ServiceRow key={i} service={service} />
        ))}
      </ul>
      {services.length > ROWS && (
        <div className="border-t border-border-panel px-6 py-4">
          <Button
            variant="link"
            size="sm"
            className="font-semibold"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? t('dashboard.services.showFewer') : t('dashboard.services.showAll', { count: services.length })}
          </Button>
        </div>
      )}
    </>
  )
}

function ServiceRow({ service }: { service: CriticalServiceHealth }) {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <li className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-body text-[0.9375rem] font-semibold text-navy [overflow-wrap:anywhere]">{service.name}</span>
        <Badge variant={PILLS[service.status]}>{t(`dashboard.services.status.${service.status}`)}</Badge>
      </span>
      <span className="font-body text-[0.8125rem] text-navy">
        <Status service={service} />
      </span>
      {service.unmatched_assets.length > 0 && (
        <span className="font-body text-[0.8125rem] text-gray [overflow-wrap:anywhere]">
          {t('dashboard.services.unmatched', {
            names: new Intl.ListFormat(locale, { type: 'conjunction' }).format(service.unmatched_assets),
          })}
        </span>
      )}
    </li>
  )
}

function Status({ service }: { service: CriticalServiceHealth }) {
  const { t } = useTranslation()
  const count = service.critical_open
  if (service.status === 'at_risk') {
    return service.in_the_news === 0
      ? t('dashboard.services.exploited', { count })
      : t('dashboard.services.inTheNews', { count, news: service.in_the_news })
  }
  if (service.status === 'watch') {
    return t('dashboard.services.aging', {
      count,
      days: t('dashboard.areas.days', { count: service.oldest_critical_days }),
    })
  }
  return service.high_open === 0
    ? t('dashboard.services.clear')
    : t('dashboard.services.clearHigh', { count: service.high_open })
}
