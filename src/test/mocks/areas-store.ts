import type { Area } from '../../api/areas'
import { mockAreas } from './areas'

const STORAGE_KEY = 'barbattack_mock_areas'

export function loadAreas(): Area[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Area[]) : mockAreas
}

export function saveAreas(areas: Area[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(areas))
}
