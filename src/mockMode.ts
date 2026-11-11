/** Mock mode: MSW answers every request and sign-in picks a role instead of asking Cognito. */
export const MOCK_MODE = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'
