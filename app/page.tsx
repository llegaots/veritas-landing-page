import { HeroVideoSection } from '@/components/landing/HeroVideoSection'
import { CaseStudiesSection } from '@/components/landing/CaseStudiesSection'
import { FAQSection } from '@/components/landing/FAQSection'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroVideoSection />
      <CaseStudiesSection />
      <FAQSection />
    </div>
  )
}
