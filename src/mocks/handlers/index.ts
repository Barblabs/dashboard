import { areasHandlers } from './areas'
import { assetsHandlers } from './assets'
import { authHandlers } from './auth'
import { businessContextHandlers } from './businessContext'
import { cmdbHandlers } from './cmdb'
import { customersHandlers } from './customers'
import { newsDigestsHandlers } from './newsDigests'
import { prioritizationsHandlers } from './prioritizations'
import { slackHandlers } from './slack'
import { usersHandlers } from './users'

export const handlers = [
  ...authHandlers,
  ...cmdbHandlers,
  ...assetsHandlers,
  ...areasHandlers,
  ...usersHandlers,
  ...customersHandlers,
  ...businessContextHandlers,
  ...prioritizationsHandlers,
  ...newsDigestsHandlers,
  ...slackHandlers,
]
