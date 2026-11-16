import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('starts hidden with toggle showing "Show password"', () => {
    render(<PasswordInput />)

    const input = document.querySelector('input')!
    expect(input.type).toBe('password')
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking the toggle reveals the value and flips the label', async () => {
    const user = userEvent.setup()
    render(<PasswordInput defaultValue="secret" />)

    const input = document.querySelector('input')!
    await user.click(screen.getByRole('button', { name: 'Show password' }))

    expect(input.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('pressing Enter in the input submits the surrounding form without activating the toggle', async () => {
    const user = userEvent.setup()
    let submitted = false
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted = true }}>
        <PasswordInput name="pw" />
        <button type="submit">Submit</button>
      </form>,
    )

    await user.type(document.querySelector('input')!, '{Enter}')

    expect(submitted).toBe(true)
  })
})
