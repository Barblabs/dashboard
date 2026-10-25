import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('runs its action when enabled', async () => {
    const onClick = vi.fn<() => void>()
    render(<Button onClick={onClick}>Sync now</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Sync now' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('ignores clicks when disabled', async () => {
    const onClick = vi.fn<() => void>()
    render(<Button disabled onClick={onClick}>Sync now</Button>)

    const button = screen.getByRole('button', { name: 'Sync now' })
    await userEvent.click(button)

    expect(button).toBeDisabled()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('announces loading, ignores clicks and keeps focus while loading', async () => {
    const onClick = vi.fn<() => void>()
    const { rerender } = render(<Button onClick={onClick}>Sync now</Button>)
    const button = screen.getByRole('button', { name: 'Sync now' })
    button.focus()

    rerender(<Button loading onClick={onClick}>Syncing…</Button>)
    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveFocus()
    expect(onClick).not.toHaveBeenCalled()
  })
})
