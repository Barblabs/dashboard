// El mock solo existe en desarrollo: el build de producción no incluye MSW.
export const isMockMode = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'
