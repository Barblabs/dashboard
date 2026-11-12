import { useTranslation } from 'react-i18next'

export function RoleOptions() {
  const { t } = useTranslation()
  return (
    <>
      <option value="viewer">{t('users.role.viewer')}</option>
      <option value="customer_admin">{t('users.role.customer_admin')}</option>
    </>
  )
}
