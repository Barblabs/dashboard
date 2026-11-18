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
})
