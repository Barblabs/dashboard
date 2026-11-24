import { ClosingCta } from './ClosingCta'
import { DataFlow } from './DataFlow'
import { Hero } from './Hero'
import { LandingNav } from './LandingNav'
import { Steps } from './Steps'

export function LandingPage() {
  return (
    <div className="bg-panel">
      <LandingNav />
      <main>
        <Hero />
        <DataFlow />
        <Steps />
      </main>
      <ClosingCta />
    </div>
  )
}
