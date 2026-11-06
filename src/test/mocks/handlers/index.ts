import { assetsHandlers } from './assets'
import { authHandlers } from './auth'
import { businessContextHandlers } from './businessContext'
import { cmdbHandlers } from './cmdb'
import { customersHandlers } from './customers'
import { usersHandlers } from './users'

export const handlers = [
  ...authHandlers,
  ...cmdbHandlers,
  ...assetsHandlers,
  ...usersHandlers,
  ...customersHandlers,
  ...businessContextHandlers,
]
