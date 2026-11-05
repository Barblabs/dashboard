import { setupWorker } from 'msw/browser'
import { handlers } from '../test/mocks/handlers'
import { authHandlers } from '../test/mocks/handlers/auth'

export const worker = setupWorker(...authHandlers, ...handlers)
