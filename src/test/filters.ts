import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Picks options in a multi-select filter, then closes its list so the page's own listbox is the only one. */
export async function chooseFilter(user: UserEvent, label: string, ...options: string[]) {
  await user.click(screen.getByRole('combobox', { name: label }))
  for (const option of options) await user.click(await screen.findByRole('option', { name: option }))
  await user.keyboard('{Escape}')
}
