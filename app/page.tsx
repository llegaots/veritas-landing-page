import { HeroVideoSection } from '@/components/landing/HeroVideoSection'
import { CaseStudiesSection } from '@/components/landing/CaseStudiesSection'
import { FAQSection } from '@/components/landing/FAQSection'
import { FloatingCTA } from '@/components/landing/FloatingCTA'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroVideoSection />
      <CaseStudiesSection />
      <FAQSection />
      <FloatingCTA />
    </div>
  )
}
