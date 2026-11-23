import { describe, expect, it } from 'vitest'
import { fromFirstRecord } from './weeks'

const week = (starts_on: string, opened: number, closed: number, open_at_end: number) => ({
  week: starts_on,
  starts_on,
  opened,
  closed,
  open_at_end,
})

describe('fromFirstRecord', () => {
  it('drops the empty weeks before the first one with findings, and keeps an empty week after it', () => {
    const weeks = [week('a', 0, 0, 0), week('b', 0, 0, 0), week('c', 3, 0, 3), week('d', 0, 0, 0), week('e', 1, 0, 4)]

    expect(fromFirstRecord(weeks).map((w) => w.starts_on)).toEqual(['c', 'd', 'e'])
  })

  it('starts at a week that only has findings still open from before', () => {
    expect(fromFirstRecord([week('a', 0, 0, 0), week('b', 0, 0, 5)]).map((w) => w.starts_on)).toEqual(['b'])
  })

  it('leaves nothing when no week has findings', () => {
    expect(fromFirstRecord([week('a', 0, 0, 0)])).toEqual([])
  })
})
