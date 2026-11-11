import type { Area } from '../api/areas'
import { mockAreas } from './areas'
import { localStore } from './localStore'

export const { load: loadAreas, save: saveAreas } = localStore<Area[]>('barbattack_mock_areas', mockAreas)
