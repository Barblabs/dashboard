import { assetsHandlers } from './assets'
import { cmdbHandlers } from './cmdb'

export const handlers = [...cmdbHandlers, ...assetsHandlers]
