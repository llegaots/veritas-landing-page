'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { track } from '@/lib/tracking'

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

    // Listen for Calendly events
    const handleCalendlyEvent = (e: MessageEvent) => {
      if (e.data.event && e.data.event.indexOf('calendly') === 0) {
        const eventName = e.data.event
        const payload = e.data.payload || {}

        if (eventName === 'calendly.date_and_time_selected') {
          // Track when user selects a date/time slot
          track('calendly_date_selected', {
            event_type: 'calendly_date_selection',
            invitee_uri: payload.invitee_uri,
            event_uri: payload.event_uri,
            time: payload.time,
          })
        } else if (eventName === 'calendly.event_scheduled') {
          // Extract name and email from payload
          const invitee = payload.invitee || {}
          const name = invitee.name || ''
          const email = invitee.email || ''

          // Track demo booked with name
          // The name will be extracted by the track function and used to update all previous events for this anonymous_id
          track('demo_booked', {
            event_type: 'calendly_booking',
            name: name,
            email: email,
            invitee_uri: payload.invitee_uri,
            event_uri: payload.event_uri,
            payload: payload,
          })
        }
      }
    }

    window.addEventListener('message', handleCalendlyEvent)

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      window.removeEventListener('message', handleCalendlyEvent)
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Schedule Your Investor Call
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Book a time that works for you to discuss the Horizon Park Apartments opportunity
            </p>
          </motion.div>

          {/* Calendly Embed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl p-4 sm:p-6 md:p-8 lg:p-10 border border-gray-200 shadow-lg max-w-4xl mx-auto"
          >
            <div className="calendly-inline-widget h-[500px] sm:h-[600px] md:h-[700px]" style={{ minWidth: '320px' }}>
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

