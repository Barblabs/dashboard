import { Agents } from './Agents'
import { ClosingCta } from './ClosingCta'
import { Hero } from './Hero'
import { LandingNav } from './LandingNav'
import { Priorities } from './Priorities'
import { Steps } from './Steps'

export function LandingPage() {
  return (
    <div className="bg-panel">
      <LandingNav />
      <main>
        <Hero />
        <Steps />
        <Priorities />
        <Agents />
      </main>
      <ClosingCta />
    </div>
  )
}
