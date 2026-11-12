import type { TFunction } from 'i18next'
import type { Asset, Exposure } from '../../api/assets'
import { EMPTY } from '../../i18n/format'

function versioned(name: string, version: string) {
  return version ? `${name} ${version}` : name
}

export function osLabel(asset: Asset): string {
  const os = asset.software.find((s) => s.role === 'operating_system')
  return os ? versioned(os.name, os.version) : EMPTY
}

/** An Exposure's name, Unknown when neither the CMDB Source nor a Declaration gives it. */
export function exposureLabel(t: TFunction<'translation'>, value: Exposure | null): string {
  return t(`config.inventory.exposure.${value ?? 'unknown'}`)
}
