import { assetsHandlers } from './assets'
import { authHandlers } from './auth'
import { cmdbHandlers } from './cmdb'
import { usersHandlers } from './users'

export const handlers = [...authHandlers, ...cmdbHandlers, ...assetsHandlers, ...usersHandlers]
