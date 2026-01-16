'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function BookingSection() {
  // Calendly embed URL
  const calendlyUrl = 'https://calendly.com/alex-veritasequitypartners/15-minute-intro-call'
  const [iframeSrc, setIframeSrc] = useState<string>('')

  useEffect(() => {
    // Set iframe src on client side only to avoid hydration mismatch
    const embedDomain = typeof window !== 'undefined' ? window.location.hostname : ''
    setIframeSrc(`${calendlyUrl}?embed_domain=${embedDomain}&embed_type=Inline`)

    // Load Calendly script
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return (
    <section id="booking-section" className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Schedule Your Investor Call
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Book a time that works for you to discuss the Horizon Park Apartments opportunity
            </p>
          </motion.div>

          {/* Calendly Embed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl p-8 lg:p-10 border border-gray-200 shadow-lg max-w-4xl mx-auto"
          >
            <div className="calendly-inline-widget" style={{ minWidth: '320px', height: '700px' }}>
              {iframeSrc && (
                <iframe
                  src={iframeSrc}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  title="Schedule time with Veritas Equity Partners"
                  className="rounded-lg"
                ></iframe>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

