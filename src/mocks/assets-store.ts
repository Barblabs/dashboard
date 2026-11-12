import type { Asset } from '../api/assets'
import { mockAssets } from './assets'
import { localStore } from './localStore'

export const assetsStore = localStore<Asset[]>('barbattack_mock_assets', mockAssets)
