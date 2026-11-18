import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/**
 * Picks options in a multi-select filter, then closes its list so the page's own listbox is the
 * only one. The advanced filters live behind the "Filters" disclosure, so it is opened first when
 * the target combobox is still hidden.
 */
export async function chooseFilter(user: UserEvent, label: string, ...options: string[]) {
  if (!screen.queryByRole('combobox', { name: label })) {
    await user.click(screen.getByRole('button', { name: /^Filters/ }))
  }
  await user.click(await screen.findByRole('combobox', { name: label }))
  for (const option of options) await user.click(await screen.findByRole('option', { name: option }))
  await user.keyboard('{Escape}')
}
