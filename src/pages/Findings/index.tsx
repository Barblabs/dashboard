import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useCurrentOrderQuery, type CurrentOrder } from '../../api/prioritizations'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Message } from '../../components/ui/Message'
import { Modal } from '../../components/ui/Modal'
import { useDateFormat } from '../../i18n/format'
import { FindingDetail } from './FindingDetail'
import { GroupPanel } from './GroupPanel'

// The open Finding lives in the URL, so a link or a reload lands on it.
const FINDING_PARAM = 'finding'

export function FindingsPage() {
  const { t } = useTranslation()
  const query = useCurrentOrderQuery()

  return (
    <Page title={t('findings.title')} subtitle={t('findings.subtitle')}>
      <QueryBoundary
        query={query}
        keys={{ loading: 'findings.loading', failed: 'findings.failed', network: 'findings.network' }}
      >
        {(order) => (order ? <CurrentOrderView order={order} /> : <Message>{t('findings.empty')}</Message>)}
      </QueryBoundary>
    </Page>
  )
}

function CurrentOrderView({ order }: { order: CurrentOrder }) {
  const { t } = useTranslation()
  const formatDate = useDateFormat()
  const [params, setParams] = useSearchParams()
  const { prioritization } = order
  const openId = params.get(FINDING_PARAM)
  const open = prioritization.findings.find((f) => f.finding_id === openId)

  const openFinding = (id: string) => setParams({ [FINDING_PARAM]: id })
  const close = () => setParams({})

  return (
    <div className="flex flex-col gap-5">
      <p className="flex flex-wrap gap-x-3 gap-y-1 font-body text-[0.875rem] text-gray">
        <span>{t('findings.summary.updated', { date: formatDate(prioritization.created_at) })}</span>
        <span aria-hidden="true">·</span>
        <span>
          {t('findings.summary.findings', { count: prioritization.findings.length })},{' '}
          {t('findings.summary.groups', { count: prioritization.groups.length })}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {prioritization.business_context_version === null
            ? t('findings.summary.noBusinessContext')
            : t('findings.summary.businessContext', { version: prioritization.business_context_version })}
        </span>
      </p>

      {prioritization.groups.map((group) => (
        <GroupPanel key={group.position} order={order} group={group} onOpen={openFinding} />
      ))}

      <Modal open={open !== undefined} onClose={close} width="xl">
        {open && <FindingDetail order={order} finding={open} onClose={close} />}
      </Modal>
    </div>
  )
}
