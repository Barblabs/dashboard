import { MOCK_MODE } from '../mockMode'
import { cognitoTokens } from './cognito'
import { mockTokens } from './mockTokens'
import type { Tokens } from './tokens'

export const tokens: Tokens = MOCK_MODE ? mockTokens : cognitoTokens
