// Prints the path of a Chromium-family browser, or exits 1. CHROME_PATH wins.
import { existsSync } from 'node:fs'
const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Helium.app/Contents/MacOS/Helium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean)
const found = candidates.find(existsSync)
if (!found) {
  console.error('No Chromium-family browser found. Set CHROME_PATH, or run: npx playwright-core install chromium (then set CHROME_PATH to its binary).')
  process.exit(1)
}
console.log(found)
