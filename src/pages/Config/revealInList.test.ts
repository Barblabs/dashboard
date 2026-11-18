import { describe, expect, it } from 'vitest'
import { revealInList } from './revealInList'

// A list showing 200px, scrolled to 100: the rows from 100 to 300 are in view.
const list = { scrollTop: 100, clientHeight: 200 }

describe('revealInList', () => {
  it('leaves the list where it is when the item is already in view', () => {
    expect(revealInList(list, { offsetTop: 150, offsetHeight: 40 })).toBe(100)
  })

  it('scrolls up to the top of an item above the view', () => {
    expect(revealInList(list, { offsetTop: 60, offsetHeight: 40 })).toBe(60)
  })

  it('scrolls down just enough to show the bottom of an item below the view', () => {
    expect(revealInList(list, { offsetTop: 280, offsetHeight: 40 })).toBe(120)
  })
})
