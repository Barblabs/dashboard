import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'
import { Input } from './Input'

describe('Field', () => {
  it('labels the control and describes it with the help text', () => {
    render(
      <Field label="User" help="Read-only REST user.">
        <Input />
      </Field>,
    )

    const input = screen.getByRole('textbox', { name: 'User' })
    expect(input).toHaveAccessibleDescription('Read-only REST user.')
    expect(input).toBeValid()
  })

  it('replaces the help text with the error and marks the control invalid', () => {
    render(
      <Field label="User" help="Read-only REST user." error="User is required.">
        <Input />
      </Field>,
    )

    const input = screen.getByRole('textbox', { name: 'User' })
    expect(input).toHaveAccessibleDescription('User is required.')
    expect(input).toBeInvalid()
    expect(screen.queryByText('Read-only REST user.')).not.toBeInTheDocument()
  })
})
