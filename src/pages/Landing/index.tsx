import { ClosingCta } from './ClosingCta'
import { DataFlow } from './DataFlow'
import { Hero } from './Hero'
import { LandingNav } from './LandingNav'

export function LandingPage() {
  return (
    <div className="bg-panel">
      <LandingNav />
      <main>
        <Hero />
        <DataFlow />
      </main>
      <ClosingCta />
    </div>
  )
}
