import type { Asset } from '../../api/assets'
import { EMPTY } from '../../i18n/format'

export function versioned(name: string, version: string) {
  return version ? `${name} ${version}` : name
}

/** The Asset's operating system and its version. */
export function osLabel(asset: Asset): string {
  const os = asset.software.find((s) => s.role === 'operating_system')
  return os ? versioned(os.name, os.version) : EMPTY
}
