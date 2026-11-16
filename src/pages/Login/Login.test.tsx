import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CognitoUser } from 'amazon-cognito-identity-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signIn, completeNewPassword } from '../../auth/cognito'
import { completeSignIn } from '../../auth/session'
import { CredentialsForm } from './CredentialsForm'
import { NewPasswordForm } from './NewPasswordForm'

vi.mock('../../auth/cognito', () => ({
  signIn: vi.fn<() => Promise<unknown>>(),
  completeNewPassword: vi.fn<() => Promise<void>>(),
  cognitoTokens: {
    hasStored: vi.fn<() => boolean>().mockReturnValue(false),
    currentAccessToken: vi.fn<() => Promise<unknown>>(),
    forget: vi.fn<() => Promise<void>>(),
    onForgottenElsewhere: vi.fn<() => () => void>().mockReturnValue(() => {}),
  },
}))

vi.mock('../../auth/session', () => ({
  completeSignIn: vi.fn<() => Promise<null>>().mockResolvedValue(null),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(completeSignIn).mockResolvedValue(null)
})

describe('CredentialsForm', () => {
  it('calls signIn with the email and password on submit', async () => {
    vi.mocked(signIn).mockResolvedValue({ kind: 'success' })
    const user = userEvent.setup()
    render(<CredentialsForm onNewPasswordRequired={vi.fn<() => void>()} />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-pass')
    await user.keyboard('{Enter}')

    expect(signIn).toHaveBeenCalledWith('admin@example.com', 'correct-pass')
  })

  it('shows a required error and does not call signIn when password is empty', async () => {
    const user = userEvent.setup()
    render(<CredentialsForm onNewPasswordRequired={vi.fn<() => void>()} />)

    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Password is required.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('shows a required error, not an invalid one, when the email is empty', async () => {
    const user = userEvent.setup()
    render(<CredentialsForm onNewPasswordRequired={vi.fn<() => void>()} />)

    await user.type(screen.getByLabelText('Password'), 'some-pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('shows an invalid email error and does not call signIn', async () => {
    const user = userEvent.setup()
    render(<CredentialsForm onNewPasswordRequired={vi.fn<() => void>()} />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'some-pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })
})

describe('NewPasswordForm', () => {
  const cognitoUser = {} as CognitoUser

  it('calls completeNewPassword with the new password when both fields match', async () => {
    vi.mocked(completeNewPassword).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<NewPasswordForm cognitoUser={cognitoUser} />)

    await user.type(screen.getByLabelText('New password'), 'NewPass123!')
    await user.type(screen.getByLabelText('Confirm password'), 'NewPass123!')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(completeNewPassword).toHaveBeenCalledWith(cognitoUser, 'NewPass123!')
  })

  it('shows a required error when the new password is empty', async () => {
    const user = userEvent.setup()
    render(<NewPasswordForm cognitoUser={cognitoUser} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Password is required.')).toBeInTheDocument()
    expect(completeNewPassword).not.toHaveBeenCalled()
  })

  it('shows a mismatch error and does not call completeNewPassword when passwords differ', async () => {
    const user = userEvent.setup()
    render(<NewPasswordForm cognitoUser={cognitoUser} />)

    await user.type(screen.getByLabelText('New password'), 'NewPass123!')
    await user.type(screen.getByLabelText('Confirm password'), 'Different456!')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(completeNewPassword).not.toHaveBeenCalled()
  })
})
