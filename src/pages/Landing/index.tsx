import { ClosingCta } from './ClosingCta'
import { Hero } from './Hero'
import { LandingNav } from './LandingNav'

export function LandingPage() {
  return (
    <div className="bg-panel">
      <LandingNav />
      <main>
        <Hero />
      </main>
      <ClosingCta />
    </div>
  )
}
