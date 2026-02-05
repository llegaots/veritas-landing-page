'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { useState, useEffect } from 'react'
import { BookingSection } from './BookingSection'
import { track } from '@/lib/tracking'

export function CaseStudiesSection() {
  const [ctaHref, setCtaHref] = useState('#booking-section')

  useEffect(() => {
    // Set full URL for Meta Pixel detection
    if (typeof window !== 'undefined') {
      setCtaHref(`${window.location.origin}${window.location.pathname}#booking-section`)
    }
  }, [])

  const handleCTAClick = () => {
    track('cta_click', { cta: 'schedule_demo', location: 'case_studies_section' })
    window.dispatchEvent(new CustomEvent('cta_click'))
  }
  const caseStudies = [
    {
      title: "Centennial West",
      location: "Walla Walla, WA",
      units: "62 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/ccaf3f36e2c7e35bcbc20d8f9005d782-uncropped_scaled_within_1536_1152.webp",
      description: "A successful workforce housing investment demonstrating our disciplined approach to value creation.",
    },
    {
      title: "Juniper",
      location: "Wenatchee, WA",
      units: "32 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/490-9th-St-NE-East-Wenatchee-WA-Building-Photo-1-Large.jpg",
      description: "Strategic acquisition and management delivering consistent cash flow and appreciation.",
    },
    {
      title: "Deauville",
      location: "Seattle, WA",
      units: "8 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/2801-14th-Ave-W-Seattle-WA-Building-Photo-1-LargeHighDefinition.jpg",
      description: "Prime Seattle location showcasing our expertise in urban multifamily investments.",
    },
    {
      title: "Lakewood",
      location: "Tacoma, WA",
      units: "16 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/1908741_0.jpg",
      description: "Workforce housing investment in growing Tacoma market.",
    },
    {
      title: "Walla",
      location: "Walla Walla, WA",
      units: "9 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/image-79.jpg",
      description: "Small-scale multifamily property in Walla Walla demonstrating portfolio diversification.",
    },
    {
      title: "Cedars",
      location: "Lynnwood, WA",
      units: "17 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/f8058543e02c3d5194ba296b69b2282e-cc_ft_768.webp",
      description: "Strategic investment in the Lynnwood market with strong growth potential.",
    },
    {
      title: "Quint Village",
      location: "Yakima, WA",
      units: "28 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/quail-ridge-yakima-wa-quail-ridge-apartments.avif",
      description: "Value-add opportunity transformed into a stable, income-producing asset.",
    },
    {
      title: "Wenatchee",
      location: "Wenatchee, WA",
      units: "7 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/buildings-city_1048944-15652056.jpg",
      description: "Small multifamily property in Wenatchee contributing to regional portfolio strength.",
    },
    {
      title: "Ridgeline",
      location: "Everett, WA",
      units: "24 Units",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/10/1759334654909.jpeg",
      description: "Professional management and strategic improvements driving strong returns.",
    },
  ]

  const team = [
    {
      name: "Alex Burch",
      role: "Partner",
      image: "https://veritasequitypartners.com/wp-content/uploads/2024/12/profilepicnew-copy1.jpg",
      credential: "Multifamily investing since 2011",
    },
    {
      name: "Lauren Rogers",
      role: "Partner",
      image: "https://veritasequitypartners.com/wp-content/uploads/2024/12/profilepicnew-copy2.jpg",
      credential: "MBA, Former global tech executive",
    },
    {
      name: "Joshua Harris",
      role: "Director of Investor Relations",
      image: "https://veritasequitypartners.com/wp-content/uploads/2025/05/joshua-harris.jpeg",
      credential: "Licensed real estate agent, Master's in Community Development",
    },
    {
      name: "Robin Bolz",
      role: "Advisor",
      image: "https://veritasequitypartners.com/wp-content/uploads/2024/12/profilepicnew-copy4.jpg",
      credential: "Head of Strategy for JP Morgan Chase Commercial Real Estate Division, MBA from Stanford",
    },
  ]

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Case Studies & Success Stories
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Veritas Equity Partners invests in workforce housing communities throughout the Pacific Northwest, 
              with a focus on stability, consistent cash flow, and long-term growth.
            </p>
          </motion.div>

          {/* Case Study Images - Portfolio Properties */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {caseStudies.map((study, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="relative aspect-video w-full">
                  <img
                    src={study.image}
                    alt={study.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {study.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span>{study.location}</span>
                    <span>•</span>
                    <span className="font-medium">{study.units}</span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {study.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* What You'll Get in the Investor Call Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                What You'll Get in the Investor Call
              </h2>
              <p className="text-xl text-gray-600">
                A comprehensive investment consultation tailored to your goals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  number: 1,
                  title: "See the Full Picture",
                  subtitle: "The Horizon Park Numbers",
                  description: "Market analysis, renovation plan, exit strategy—we'll show you why this property is positioned for 18.1% returns and how we're protecting your downside.",
                },
                {
                  number: 2,
                  title: "Know Your Returns",
                  subtitle: "Your Investment, Your Numbers",
                  description: "We'll calculate your specific quarterly cash flow, tax advantages, and profit at exit. No guesswork—just your actual projected returns.",
                },
                {
                  number: 3,
                  title: "Next Steps (If You're In)",
                  subtitle: "Simple Investment Process",
                  description: "If you like what you see, we'll walk you through our streamlined investment process. Most investors are funded within 5 business days.",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-xl p-8 shadow-md border border-gray-200"
                >
                  <div className="flex flex-col items-start">
                    <div className="flex-shrink-0 mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-orange-500 rounded-full text-white text-xl font-bold">
                        {item.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className="text-orange-600 font-semibold mb-3">
                          {item.subtitle}
                        </p>
                      )}
                      <p className="text-gray-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 text-center"
            >
              <a
                href={ctaHref}
                onClick={(e) => {
                  e.preventDefault()
                  handleCTAClick()
                  document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                data-cta="schedule_demo"
                data-event="cta_click"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg sm:text-xl md:text-2xl lg:text-3xl px-6 py-4 sm:px-8 sm:py-5 md:px-12 md:py-6 lg:px-16 lg:py-8 rounded-lg transition-colors duration-200 shadow-lg"
              >
                SHOW ME THE DEAL
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Stats and Why Invest Section with Grey Background - Full Width */}
      <div className="bg-slate-50 w-full">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl py-16 lg:py-24">
            {/* Stats Section - Dark Blue Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="bg-slate-900 rounded-2xl p-8 lg:p-12 text-white text-center shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="text-4xl lg:text-5xl font-bold mb-2">$50M+</div>
                    <div className="text-gray-300">Assets Under Management</div>
                  </div>
                  <div>
                    <div className="text-4xl lg:text-5xl font-bold mb-2">32%</div>
                    <div className="text-gray-300">Lifetime Annualized ROI</div>
                  </div>
                  <div>
                    <div className="text-4xl lg:text-5xl font-bold mb-2">10+</div>
                    <div className="text-gray-300">Years in PNW Multifamily</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Why Invest Section - White Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-lg border border-gray-200">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 text-center">
                  Why Invest With Veritas Equity Partners?
                </h2>
                
                <div className="max-w-3xl mx-auto">
                  <ul className="space-y-4 text-lg text-gray-700">
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-3 font-bold">•</span>
                      <span>Unique investment opportunity in the multifamily real estate market with a team that has <strong>consistently delivered outstanding returns</strong></span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-3 font-bold">•</span>
                      <span>Strategic approach and experienced team with <strong>15 years of experience</strong> ensure both <strong>high returns</strong> and community enhancement</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-3 font-bold">•</span>
                      <span>Proven track record with <strong>$50 million in assets under management</strong> and <strong>32% lifetime annualized ROI</strong></span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Booking Section */}
      <BookingSection />

      {/* Team Section */}
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl py-8 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Meet the Team
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {team.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto mb-4 rounded-lg overflow-hidden border-4 border-orange-100 shadow-lg">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">{member.name}</h4>
                  <p className="text-orange-600 font-medium mb-2">{member.role}</p>
                  <p className="text-sm text-gray-600">{member.credential}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

