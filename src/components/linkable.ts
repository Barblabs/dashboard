/*
 * URLs come from Feeds and Agents. Only http and https become links, so a `javascript:` URL
 * cannot run when clicked: the caller shows it as text instead.
 */
export function linkable(url: string): URL | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null
  } catch {
    return null
  }
}
