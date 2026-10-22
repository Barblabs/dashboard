// The mock only exists in development: the production build does not include MSW.
export const isMockMode = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'
