import { http } from 'msw'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'
import { apiUrl } from './mocks/url'

export const server = setupServer(...handlers)

// Keeps requests to the endpoint pending so a test can see the busy state; once released they
// fall through to the default handler.
export function holdRequests(method: 'get' | 'post' | 'put' | 'delete', path: string) {
  let release!: () => void
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http[method](apiUrl(path), async () => {
      await released
    }),
  )
  return release
}
