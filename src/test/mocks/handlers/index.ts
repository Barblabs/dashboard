import { assetsHandlers } from './assets'
import { authHandlers } from './auth'
import { cmdbHandlers } from './cmdb'

export const handlers = [...authHandlers, ...cmdbHandlers, ...assetsHandlers]
