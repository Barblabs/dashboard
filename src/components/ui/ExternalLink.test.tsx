import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExternalLink } from './ExternalLink'

describe('ExternalLink', () => {
  it('renders an https URL as a link opening in a new tab', () => {
    render(<ExternalLink href="https://example.com/page" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com/page')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders a javascript: URL as plain text with no link', () => {
    render(<ExternalLink href="javascript:alert(1)" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument()
  })

  it('renders a malformed string as plain text with no link', () => {
    render(<ExternalLink href="not a url" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('not a url')).toBeInTheDocument()
  })
})
