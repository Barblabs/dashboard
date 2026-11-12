import type { ComponentType } from 'react'
import type { Role } from './auth/store'
import { AdminDashboardPage } from './pages/AdminDashboard'
import { BusinessContextPage } from './pages/BusinessContext'
import { ConfigPage } from './pages/Config'
import { FindingsPage } from './pages/Findings'
import { NotificationsPage } from './pages/Notifications'
import { TenantsPage } from './pages/Tenants'
import { UsersPage } from './pages/Users'

interface PageRoute {
  /** The page's path, and its key under `sidebar.nav`. */
  id: string
  Page: ComponentType
  roles: readonly Role[]
}

const CUSTOMER_ROLES: readonly Role[] = ['customer_admin', 'viewer']

/*
 * Every page behind the sidebar and who may open it. The router guards each one with its
 * roles and the sidebar lists, in this order, the ones the signed-in role may open.
 */
export const PAGES = [
  { id: 'findings', Page: FindingsPage, roles: CUSTOMER_ROLES },
  { id: 'config', Page: ConfigPage, roles: CUSTOMER_ROLES },
  { id: 'business-context', Page: BusinessContextPage, roles: CUSTOMER_ROLES },
  { id: 'notifications', Page: NotificationsPage, roles: CUSTOMER_ROLES },
  { id: 'users', Page: UsersPage, roles: ['customer_admin'] },
  { id: 'tenants', Page: TenantsPage, roles: ['platform_admin'] },
  { id: 'admin-dashboard', Page: AdminDashboardPage, roles: ['platform_admin'] },
] as const satisfies readonly PageRoute[]

export type PageId = (typeof PAGES)[number]['id']

const HOME: Record<Role, PageId> = {
  platform_admin: 'tenants',
  customer_admin: 'config',
  viewer: 'config',
}

export function pagesFor(role: Role) {
  return PAGES.filter((page: PageRoute) => page.roles.includes(role))
}

/** Where the role lands when no page was asked for. */
export function homePath(role: Role) {
  return `/${HOME[role]}`
}
