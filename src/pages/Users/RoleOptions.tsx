import { useTranslation } from 'react-i18next'
import { CUSTOMER_ROLES } from '../../api/users'

export function RoleOptions() {
  const { t } = useTranslation()
  return CUSTOMER_ROLES.map((role) => (
    <option key={role} value={role}>
      {t(`users.role.${role}`)}
    </option>
  ))
}
