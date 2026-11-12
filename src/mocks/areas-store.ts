import type { Area } from '../api/areas'
import { mockAreas } from './areas'
import { localStore } from './localStore'

export const areasStore = localStore<Area[]>('barbattack_mock_areas', mockAreas)
