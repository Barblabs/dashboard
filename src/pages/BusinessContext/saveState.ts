import type { SaveBusinessContext } from '../../api/businessContext'

export type SaveState =
  | { status: 'clean' }
  | { status: 'dirty' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'failed'; error: Error }

/** A success only counts while its version is still the one shown and nothing was typed since. */
export function saveStateOf(save: SaveBusinessContext, version: number, dirty: boolean): SaveState {
  if (save.isPending) return { status: 'saving' }
  if (save.isError) return { status: 'failed', error: save.error }
  if (dirty) return { status: 'dirty' }
  if (save.isSuccess && save.data.version === version) return { status: 'saved' }
  return { status: 'clean' }
}
