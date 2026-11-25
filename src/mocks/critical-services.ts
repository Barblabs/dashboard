import type { CriticalServiceHealth } from '../api/businessContext'

export const mockCriticalServices: CriticalServiceHealth[] = [
  {
    name: 'Pagos en línea',
    status: 'at_risk',
    critical_open: 2,
    high_open: 1,
    in_the_news: 1,
    oldest_critical_days: 47,
    unmatched_assets: [],
  },
  {
    name: 'Facturación',
    status: 'watch',
    critical_open: 1,
    high_open: 2,
    in_the_news: 0,
    oldest_critical_days: 12,
    unmatched_assets: [],
  },
  {
    name: 'Nómina',
    status: 'clear',
    critical_open: 0,
    high_open: 1,
    in_the_news: 0,
    oldest_critical_days: null,
    unmatched_assets: ['nomina-legacy', 'hr-portal'],
  },
]
