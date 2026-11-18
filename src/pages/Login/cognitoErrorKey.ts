type LoginErrorKey =
  | 'login.errors.badCredentials'
  | 'login.errors.userDisabled'
  | 'login.errors.network'
  | 'login.errors.passwordPolicy'

export function cognitoErrorKey(err: unknown): LoginErrorKey {
  if (err instanceof Error) {
    if (err.name === 'NotAuthorizedException' || err.name === 'UserNotFoundException') {
      return 'login.errors.badCredentials'
    }
    if (err.name === 'InvalidPasswordException' || err.name === 'InvalidParameterException') {
      return 'login.errors.passwordPolicy'
    }
  }
  return 'login.errors.network'
}
