interface ScrollBox {
  scrollTop: number
  clientHeight: number
}

interface Item {
  offsetTop: number
  offsetHeight: number
}

/**
 * The list's scrollTop that brings the item fully into view with the least movement.
 * Unlike scrollIntoView, it scrolls only the list, never the window around it.
 */
export function revealInList(list: ScrollBox, item: Item): number {
  const bottom = item.offsetTop + item.offsetHeight
  if (item.offsetTop < list.scrollTop) return item.offsetTop
  if (bottom > list.scrollTop + list.clientHeight) return bottom - list.clientHeight
  return list.scrollTop
}
